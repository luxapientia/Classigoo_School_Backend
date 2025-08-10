import { Injectable, BadRequestException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import { User } from '../auth/schemas/user.schema';
import { ChildParent } from './schemas/child-parent.schema';
import { Notification } from '../notification/schemas/notification.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ManageSubscriptionDto } from './dto/manage-subscription.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { JwtPayload } from '../../common/decorators/user.decorator';

@Injectable()
export class SubscriptionService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(ChildParent) private childParentRepository: Repository<ChildParent>,
    @InjectRepository(Notification) private notificationRepository: Repository<Notification>,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('env.stripe.secretKey') || '', {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async getSubscriptions(userId: string, currentUser: JwtPayload): Promise<SubscriptionResponseDto> {
    try {
      if (userId !== currentUser.user_id) {
        const parentChildRelation = await this.childParentRepository.findOne({
          where: {
            parent: { id: currentUser.user_id },
            child: { id: userId },
            status: 'accepted',
          },
          relations: ['parent', 'child']
        });

        if (!parentChildRelation) {
          throw new UnauthorizedException('You are not allowed to get subscriptions for this user');
        }
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException('User not found');
      }

      const [childCount, parentCount] = await Promise.all([
        this.childParentRepository.count({
          where: {
            parent: { id: userId },
            status: 'accepted',
          }
        }),
        this.childParentRepository.count({
          where: {
            child: { id: userId },
            status: 'accepted',
          }
        })
      ]);

      const childrenData = await this.childParentRepository
        .createQueryBuilder('cp')
        .leftJoinAndSelect('cp.child', 'child')
        .where('cp.parent.id = :parentId', { parentId: userId })
        .andWhere('cp.status = :status', { status: 'accepted' })
        .select([
          'child.id as child_id',
          'child.email as child_email',
          'child.name as child_name',
          'child.avatar as child_avatar',
          'child.is_plus as child_is_plus'
        ])
        .getRawMany();

      // Transform the raw data to match the expected format
      const formattedChildrenData = childrenData.map(child => ({
        id: child.child_id,
        email: child.child_email,
        name: child.child_name,
        avatar: child.child_avatar?.url || null,
        is_plus: child.child_is_plus
      }));

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar?.url,
          is_plus: user.is_plus,
        },
        children_count: childCount,
        parents_count: parentCount,
        children: formattedChildrenData,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to get subscriptions');
    }
  }

  private async createNotification(userId: string, content: string, image: string) {
    await this.notificationRepository.save({
      user: { id: userId },
      content,
      image,
      link: '/subscriptions',
      is_read: false,
    });
  }

  async createSubscription(createSubscriptionDto: CreateSubscriptionDto, currentUser: JwtPayload) {
    try {
      const { id: userToSubscribe, plan } = createSubscriptionDto;
      const currentUserId = currentUser.user_id;

      // Get current user details
      const currentUserDetails = await this.userRepository.findOne({ where: { id: currentUserId } });
      if (!currentUserDetails) {
        throw new BadRequestException('Current user not found');
      }

      if (plan !== 'monthly' && plan !== 'yearly') {
        throw new BadRequestException('Invalid plan');
      }

      const selectedPlan = plan === 'monthly'
        ? this.configService.get<string>('env.stripe.monthlySubscriptionPriceId')
        : this.configService.get<string>('env.stripe.yearlySubscriptionPriceId');

      // Check if user has permission
      if (currentUserId !== userToSubscribe) {
        const parentChildRelation = await this.childParentRepository.findOne({
          where: {
            parent: { id: currentUserId },
            child: { id: userToSubscribe },
            status: 'accepted',
          }
        });

        if (!parentChildRelation) {
          throw new UnauthorizedException('You are not allowed to manage subscription for this user');
        }
      }

      // Get user
      const user = await this.userRepository.findOne({ where: { id: userToSubscribe } });
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Check if user is already subscribed
      if (user.is_plus) {
        return {
          status: 'error',
          message: 'User is already subscribed to Classigoo Plus'
        };
      }

      let stripeCustomerId = user.subscription?.stripe_customer_id;

      if (!stripeCustomerId) {
        // Create new customer
        const customer = await this.stripe.customers.create({
          name: user.name,
          email: user.email,
        });

        // Update user with stripe customer id
        await this.userRepository.update(userToSubscribe, {
          subscription: {
            ...user.subscription,
            stripe_customer_id: customer.id,
          }
        });

        stripeCustomerId = customer.id;
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: selectedPlan,
            quantity: 1,
          },
        ],
        customer: stripeCustomerId,
        success_url: `${this.configService.get<string>('env.frontendUrl')}/subscriptions?status=success`,
        cancel_url: `${this.configService.get<string>('env.frontendUrl')}/subscriptions?status=cancel`,
      });

      await this.createNotification(
        userToSubscribe,
        'Your Classigoo Plus subscription checkout session has been created',
        currentUserDetails.avatar.url,
      );

      return {
        status: 'success',
        message: 'Session created',
        url: session.url,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  async manageSubscription(manageSubscriptionDto: ManageSubscriptionDto, currentUser: JwtPayload) {
    try {
      const { id: userToManage } = manageSubscriptionDto;
      const currentUserId = currentUser.user_id;

      // Get current user details
      const currentUserDetails = await this.userRepository.findOne({ where: { id: currentUserId } });
      if (!currentUserDetails) {
        throw new BadRequestException('Current user not found');
      }

      // Check if user has permission
      if (currentUserId !== userToManage) {
        const parentChildRelation = await this.childParentRepository.findOne({
          where: {
            parent: { id: currentUserId },
            child: { id: userToManage },
            status: 'accepted',
          }
        });

        if (!parentChildRelation) {
          throw new UnauthorizedException('You are not allowed to manage subscription for this user');
        }
      }

      // Get user
      const user = await this.userRepository.findOne({ where: { id: userToManage } });
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Check if user is subscribed
      if (!user.is_plus) {
        return {
          status: 'error',
          message: 'User is not subscribed to Classigoo Plus'
        };
      }

      const stripeCustomerId = user.subscription?.stripe_customer_id;

      if (!stripeCustomerId) {
        throw new BadRequestException('User does not have any active subscription');
      }

      // Generate portal session
      const session = await this.stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${this.configService.get<string>('env.frontendUrl')}/subscriptions`,
      });

      await this.createNotification(
        userToManage,
        'Your Classigoo Plus subscription management portal is ready',
        currentUserDetails.avatar.url,
      );

      return {
        status: 'success',
        message: 'Subscription portal session created',
        url: session.url,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Failed to manage subscription');
    }
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    let event: Stripe.Event;

    // Validate signature presence
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.configService.get<string>('env.stripe.webhookSecret') || '',
      );
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    const returned = event.data.object as any;

    // Get user by stripe customer id
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where("user.subscription->>'stripe_customer_id' = :customerId", { customerId: returned.customer })
      .getOne();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    console.log(`Processing event ${event.type} for user ${user.email}`);

    switch (event.type) {
      case 'checkout.session.completed':
        if (returned.mode === 'subscription' && returned.payment_status === 'paid') {
          await this.updateSubscriptionStatus(user.id, {
            is_plus: true,
            subscription: {
              ...user.subscription,
              stripe_subscription_id: returned.subscription,
              current_period_start: new Date(returned.created * 1000),
              current_period_end: new Date(returned.expires_at * 1000),
            }
          });
        }
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        if (returned.status === 'active') {
          await this.updateSubscriptionStatus(user.id, {
            is_plus: true,
            subscription: {
              ...user.subscription,
              stripe_subscription_id: returned.id,
              current_period_start: new Date(returned.current_period_start * 1000),
              current_period_end: new Date(returned.current_period_end * 1000),
            }
          });
        }
        break;

      case 'customer.subscription.deleted':
        await this.updateSubscriptionStatus(user.id, {
          is_plus: false,
          subscription: {
            ...user.subscription,
            stripe_subscription_id: null,
            current_period_start: null,
            current_period_end: null,
          }
        });
        break;

      case "invoice.payment_succeeded":
        break;
  
      case "invoice.payment_failed":
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }

  private async updateSubscriptionStatus(userId: string, update: any) {
    await this.userRepository.update(userId, update);
  }
} 