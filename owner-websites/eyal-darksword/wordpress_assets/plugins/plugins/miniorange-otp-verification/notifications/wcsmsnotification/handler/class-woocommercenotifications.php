<?php
/**
 * Handler functions for Woocommerce Notifications
 *
 * @package miniorange-otp-verification/Notifications/wcsmsnotification/handler
 */

namespace OTP\Notifications\WcSMSNotification\Handler;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Notifications\WcSMSNotification\Helper\MoWcAddOnMessages;
use OTP\Notifications\WcSMSNotification\Helper\MoWcAddOnUtility;
use OTP\Notifications\WcSMSNotification\Helper\WcOrderStatus;
use OTP\Notifications\WcSMSNotification\Helper\WooCommerceNotificationsList;
use OTP\Helper\MoConstants;
use OTP\Helper\MoUtility;
use OTP\Helper\MoFormDocs;
use OTP\Objects\BaseAddOnHandler;
use OTP\Traits\Instance;
use OTP\Objects\BaseMessages;
use WC_Emails;
use WC_Order;
use OTP\Helper\MoMessages;
use Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController;

/**
 * The class is used to handle all woocommerce notification related functionality.
 * This class hooks into all the available notification hooks and filters of
 * woocommerce to provide the possibility of SMS notifications.
 */
if ( ! class_exists( 'WooCommerceNotifications' ) ) {
	/**
	 * WooCommerceNotifications class
	 */
	class WooCommerceNotifications extends BaseAddOnHandler {

		use Instance;

		/**
		 * The list of all the Notification Settings
		 *
		 * @var WooCommerceNotificationsList
		 */
		private $notification_settings;

		/**
		 * Constructor checks if add-on has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make the add-on functionality work.
		 */
		protected function __construct() {
			parent::__construct();

			$this->nonce     = 'mo_custom_order_sms_nonce';
			$this->nonce_key = 'security';

			if ( ! $this->moAddOnV() ) {
				return;
			}
			// Secure deserialization with validation and PHP 5.6 compatibility.

			add_action( 'init', array( $this, 'mo_otp_old_notification_settings' ) );
			add_action( 'woocommerce_created_customer_notification', array( $this, 'mo_send_new_customer_sms_notif' ), 1, 3 );
			add_action( 'woocommerce_new_customer_note_notification', array( $this, 'mo_send_new_customer_sms_note' ), 1, 1 );
			add_action( 'woocommerce_order_status_changed', array( $this, 'mo_send_admin_order_sms_notif' ), 1, 3 );
			add_action( 'woocommerce_order_status_changed', array( $this, 'mo_customer_order_status_sms_notification' ), 1, 3 );

			// Secure file existence checks before adding actions.
			if ( defined( 'MSN_DIR' ) && ! empty( MSN_DIR ) ) {
				if ( MoUtility::mo_require_file( MSN_DIR . 'helper/notifications/class-woocommerceproductlowstocknotification.php', MSN_DIR ) ) {
					add_action( 'woocommerce_low_stock', array( $this, 'mo_send_admin_low_stock_notif' ), 11, 1 );
				}
				if ( MoUtility::mo_require_file( MSN_DIR . 'helper/notifications/class-woocommerceproductoutofstocknotification.php', MSN_DIR ) ) {
					add_action( 'woocommerce_no_stock', array( $this, 'mo_send_admin_out_of_stock_notif' ), 10, 1 );
				}
			}

			add_action( 'admin_init', array( $this, 'handle_admin_actions' ) );
			add_action( 'admin_init', array( $this, 'check_wc_notifications_options' ) );
			add_action( 'add_meta_boxes', array( $this, 'add_custom_msg_meta_box' ), 1 );
		}

		/**
		 * This function is used to migrate the old notification settings to the new notification settings.
		 *
		 * @return void
		 */
		public function mo_otp_old_notification_settings() {
			$notification_settings = WooCommerceNotificationsList::mo_otp_get_instance();
			if ( empty( get_wc_option( 'notification_settings_option' ) ) && ! empty( get_wc_option( 'notification_settings' ) ) ) {
				$old_notification_settings = get_option( 'mo_wc_sms_notification_settings' );
				if ( is_array( $old_notification_settings ) ) {
					foreach ( $old_notification_settings as $notification_name => $property ) {
						if ( ! empty( $property ) && is_array( $property ) ) {
							$notification_name = sanitize_key( $notification_name );
							if ( property_exists( $notification_settings, $notification_name ) ) {
								$sms_settings                                       = $notification_settings->$notification_name;
								$notification_settings->sms_settings->is_enabled    = isset( $property['is_enabled'] ) ? (bool) boolval( sanitize_text_field( wp_unslash( $property['is_enabled'] ) ) ) : false;
								$notification_settings->sms_settings->sms_body      = isset( $property['sms_body'] ) ? sanitize_textarea_field( wp_unslash( $property['sms_body'] ) ) : '';
								$notification_settings->sms_settings->recipient     = isset( $property['recipient'] ) ? sanitize_text_field( wp_unslash( $property['recipient'] ) ) : '';
								$notification_settings->sms_settings->sms_tags      = isset( $property['sms_tags'] ) ? sanitize_text_field( wp_unslash( $property['sms_tags'] ) ) : '';
								$notification_settings->sms_settings->template_name = isset( $property['template_name'] ) ? sanitize_text_field( wp_unslash( $property['template_name'] ) ) : '';
							}
						}
					}
					update_wc_option( 'notification_settings_option', $notification_settings );
				}
			}
		}

		/**
		 * Checks and save the notifications
		 */
		public function check_wc_notifications_options() {
			if ( ! ( isset( $_POST['option'] ) && 'mo_wc_sms_notif_settings' === sanitize_text_field( wp_unslash( $_POST['option'] ) ) ) ) {
				return;
			}
			if ( ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_options' ) ) || ! check_admin_referer( 'mo_admin_actions' ) ) {
				wp_die( esc_html( MoMessages::showMessage( MoMessages::INVALID_OP ) ) );
			}
			$this_notification_settings = get_wc_option( 'notification_settings_option' );
			// Input validation for notification settings.
			if ( ! is_object( $this_notification_settings ) ) {
				$this_notification_settings = WooCommerceNotificationsList::mo_otp_get_instance();
			}

			foreach ( $this_notification_settings as $notification_name => $notification_setting ) {
				if ( ! $notification_setting || ! is_object( $notification_setting ) ) {
					continue;
				}

				// Sanitize notification name.
				$notification_name = sanitize_key( $notification_name );
				if ( empty( $notification_name ) ) {
					continue;
				}

				$textarea_tag      = $notification_name . '_smsbody';
				$recipient_tag     = $notification_name . '_recipient';
				$template_name_tag = $notification_name . '_template_name';
				$sms_tags_tag      = $notification_name . '_sms_tags';
				$notification      = $this_notification_settings->$notification_name;

				// Enhanced input validation and sanitization.
				$textarea_value  = isset( $_POST[ $textarea_tag ] ) ? sanitize_textarea_field( wp_unslash( $_POST[ $textarea_tag ] ) ) : '';
				$sms             = MoUtility::is_blank( $textarea_value ) ? $notification->default_sms_body : $textarea_value;
				$recipient_value = isset( $_POST[ $recipient_tag ] ) ? sanitize_text_field( wp_unslash( $_POST[ $recipient_tag ] ) ) : '';
				$template_name   = isset( $_POST[ $template_name_tag ] ) ? sanitize_text_field( wp_unslash( $_POST[ $template_name_tag ] ) ) : '';
				$sms_tags        = isset( $_POST[ $sms_tags_tag ] ) ? sanitize_text_field( wp_unslash( $_POST[ $sms_tags_tag ] ) ) : '';

				$notification = $this_notification_settings->$notification_name;
				$post_data    = wp_unslash( $_POST );
				$notification->set_is_enabled( isset( $post_data[ $notification_name ] ) );
				$notification->set_recipient( $recipient_value );
				$notification->set_sms_body( $sms );
				$notification->set_template_name( $template_name );
				$notification->set_sms_tags( $sms_tags );
			}
			update_wc_option( 'notification_settings_option', $this_notification_settings );
		}

		/**
		 * This function hooks into the admin_init WordPress hook. This function
		 * checks the form being posted and routes the data to the correct function
		 * for processing. The 'option' value in the form post is checked to make
		 * the diversion.
		 */
		public function handle_admin_actions() {
			if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_options' ) ) {
				return;
			}

			// Enhanced CSRF protection for AJAX requests.
			$post_data = wp_unslash( $_POST );
			if ( array_key_exists( 'mo_send_custome_msg_option', $post_data ) ) {
				// Security: Use hardcoded nonce key 'security' and action 'mo_custom_order_sms_nonce' instead of variables.
				if ( ! isset( $_POST['security'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['security'] ) ), 'mo_custom_order_sms_nonce' ) ) {
					wp_die( esc_html( MoMessages::showMessage( MoMessages::INVALID_OP ) ) );
				}
			}

			$data    = MoUtility::mo_sanitize_array( $post_data );
			$getdata = MoUtility::mo_sanitize_array( wp_unslash( $_GET ) );

			if ( isset( $getdata['mo_send_custome_msg_option'] ) && sanitize_text_field( $getdata['mo_send_custome_msg_option'] ) === 'mo_send_order_custom_msg' ) {
				$this->send_custom_order_msg( $data );
			}
		}

		/**
		 * This function hooks into the woocommerce_low_stock hook
		 * to send an SMS notification to the admin when the stock inventory is low.
		 *
		 * @param array $product - product stock quantity.
		 * @return void
		 */
		public function mo_send_admin_low_stock_notif( $product ) {
			// Input validation for product parameter.
			if ( ! is_object( $product ) && ! is_array( $product ) ) {
				return;
			}

			$notification_settings = get_wc_option( 'notification_settings_option' );
			if ( empty( $notification_settings ) || ! is_object( $notification_settings ) ) {
				$notification_settings = WooCommerceNotificationsList::mo_otp_get_instance();
			}
			$notification = WooCommerceNotificationsList::mo_get_wc_product_low_stock_notif();
			if ( is_object( $notification ) && method_exists( $notification, 'send_sms' ) ) {
				$notification->send_sms(
					array(
						'product_details' => $product,
					)
				);
			}
		}

		/**
		 * This function hooks into the woocommerce_no_stock hook
		 * to send an SMS notification to the admin when the stock inventory is zero.
		 *
		 * @param array $product - product stock quantity.
		 * @return void
		 */
		public function mo_send_admin_out_of_stock_notif( $product ) {
			// Input validation for product parameter.
			if ( ! is_object( $product ) && ! is_array( $product ) ) {
				return;
			}

			$notification_settings = get_wc_option( 'notification_settings_option' );
			if ( empty( $notification_settings ) || ! is_object( $notification_settings ) ) {
				$notification_settings = WooCommerceNotificationsList::mo_otp_get_instance();
			}
			$notification = WooCommerceNotificationsList::mo_get_wc_product_out_of_stock_notif();
			if ( is_object( $notification ) && method_exists( $notification, 'send_sms' ) ) {
				$notification->send_sms(
					array(
						'product_details' => $product,
					)
				);
			}
		}

		/**
		 * This function hooks into the woocommerce_created_customer_notification hook
		 * to send an SMS notification to the user when he successfully creates an
		 * account using the checkout or registration page.
		 *
		 * @param  string $customer_id        id of the customer.
		 * @param  array  $new_customer_data  array of customer data.
		 * @param  bool   $password_generated was password is automatically generated.
		 */
		public function mo_send_new_customer_sms_notif( $customer_id, $new_customer_data = array(), $password_generated = false ) {
			$customer_id = absint( $customer_id );
			if ( empty( $customer_id ) ) {
				return;
			}

			$notification_settings = get_wc_option( 'notification_settings_option' );
			if ( empty( $notification_settings ) || ! is_object( $notification_settings ) ) {
				$notification_settings = WooCommerceNotificationsList::mo_otp_get_instance();
			}
			$notification = isset( $notification_settings->wc_new_customer_notif ) ? $notification_settings->wc_new_customer_notif : WooCommerceNotificationsList::mo_get_wc_new_customer_notif();
			if ( is_object( $notification ) && method_exists( $notification, 'send_sms' ) ) {
				$notification->send_sms(
					array(
						'customer_id'        => $customer_id,
						'new_customer_data'  => is_array( $new_customer_data ) ? $new_customer_data : array(),
						'password_generated' => (bool) $password_generated,
					)
				);
			}
		}

		/**
		 * This function hooks into the woocommerce_new_customer_note_notification hook
		 * to send an SMS notification to the user when the admin successfully adds a
		 * note to the order that the user has ordered.
		 *
		 * @param  array $args array Customer note details.
		 */
		public function mo_send_new_customer_sms_note( $args ) {
			// Input validation.
			if ( ! is_array( $args ) || ! isset( $args['order_id'] ) ) {
				return;
			}

			$order_id = absint( $args['order_id'] );
			if ( empty( $order_id ) ) {
				return;
			}

			$order = wc_get_order( $order_id );
			if ( ! is_a( $order, 'WC_Order' ) ) {
				return;
			}

			$notification_settings = get_wc_option( 'notification_settings_option' );
			if ( empty( $notification_settings ) || ! is_object( $notification_settings ) ) {
				$notification_settings = WooCommerceNotificationsList::mo_otp_get_instance();
			}
			$notification = isset( $notification_settings->wc_customer_note_notif ) ? $notification_settings->wc_customer_note_notif : WooCommerceNotificationsList::mo_get_wc_customer_note_notif();
			if ( is_object( $notification ) && method_exists( $notification, 'send_sms' ) ) {
				$notification->send_sms( array( 'orderDetails' => $order ) );
			}
		}

		/**
		 * This function hooks into woocommerce_order_status_changed hook
		 * to send an SMS notification to the admin that a order needs to be
		 * processed as its status has changed.
		 *
		 * @param int    $order_id string the id of the order.
		 * @param string $old_status string the old status of the order.
		 * @param string $new_status string the new status of the order.
		 */
		public function mo_send_admin_order_sms_notif( $order_id, $old_status, $new_status ) {
			// Input validation.
			$order_id = absint( $order_id );
			if ( empty( $order_id ) ) {
				return;
			}

			$old_status = sanitize_text_field( wp_unslash( $old_status ) );
			$new_status = sanitize_text_field( wp_unslash( $new_status ) );

			$order = new WC_Order( $order_id );
			if ( ! is_a( $order, 'WC_Order' ) ) {
				return;
			}

			$notification_settings = get_wc_option( 'notification_settings_option' );
			if ( empty( $notification_settings ) || ! is_object( $notification_settings ) ) {
				$notification_settings = WooCommerceNotificationsList::mo_otp_get_instance();
			}
			$notification = isset( $notification_settings->wc_admin_order_status_notif ) ? $notification_settings->wc_admin_order_status_notif : WooCommerceNotificationsList::mo_get_wc_admin_order_status_notif();
			if ( is_object( $notification ) && method_exists( $notification, 'send_sms' ) ) {
				$notification->send_sms(
					array(
						'orderDetails' => $order,
						'new_status'   => $new_status,
						'old_status'   => $old_status,
					)
				);
			}
		}

		/**
		 * This function hooks into all of the On-Hold notification Woocommerce
		 * hook to send an SMS notification to the customer that a order has been
		 * put on hold
		 *
		 * @param int    $order_id string the id of the order.
		 * @param string $old_status string the old status of the order.
		 * @param string $new_status string the new status of the order.
		 */
		public function mo_customer_order_status_sms_notification( $order_id, $old_status, $new_status ) {
			// Input validation.
			$order_id = absint( $order_id );
			if ( empty( $order_id ) ) {
				return;
			}

			$new_status = sanitize_text_field( wp_unslash( $new_status ) );

			$order = new WC_Order( $order_id );
			if ( ! is_a( $order, 'WC_Order' ) ) {
				return;
			}

			$notification          = null;
			$notification_settings = get_wc_option( 'notification_settings_option' );
			if ( empty( $notification_settings ) || ! is_object( $notification_settings ) ) {
				$notification_settings = WooCommerceNotificationsList::mo_otp_get_instance();
			}
			if ( strcasecmp( $new_status, WcOrderStatus::ON_HOLD ) === 0 ) {
				$notification = isset( $notification_settings->wc_order_on_hold_notif ) ? $notification_settings->wc_order_on_hold_notif : WooCommerceNotificationsList::mo_get_wc_order_on_hold_notif();
			} elseif ( strcasecmp( $new_status, WcOrderStatus::PROCESSING ) === 0 ) {
				$notification = isset( $notification_settings->wc_order_processing_notif ) ? $notification_settings->wc_order_processing_notif : WooCommerceNotificationsList::mo_get_wc_order_processing_notif();
			} elseif ( strcasecmp( $new_status, WcOrderStatus::COMPLETED ) === 0 ) {
				$notification = isset( $notification_settings->wc_order_completed_notif ) ? $notification_settings->wc_order_completed_notif : WooCommerceNotificationsList::mo_get_wc_order_completed_notif();
			} elseif ( strcasecmp( $new_status, WcOrderStatus::REFUNDED ) === 0 ) {
				$notification = isset( $notification_settings->wc_order_refunded_notif ) ? $notification_settings->wc_order_refunded_notif : WooCommerceNotificationsList::mo_get_wc_order_refunded_notif();
			} elseif ( strcasecmp( $new_status, WcOrderStatus::CANCELLED ) === 0 ) {
				$notification = isset( $notification_settings->wc_order_cancelled_notif ) ? $notification_settings->wc_order_cancelled_notif : WooCommerceNotificationsList::mo_get_wc_order_cancelled_notif();
			} elseif ( strcasecmp( $new_status, WcOrderStatus::FAILED ) === 0 ) {
				$notification = isset( $notification_settings->wc_order_failed_notif ) ? $notification_settings->wc_order_failed_notif : WooCommerceNotificationsList::mo_get_wc_order_failed_notif();
			} elseif ( strcasecmp( $new_status, WcOrderStatus::PENDING ) === 0 ) {
				$notification = isset( $notification_settings->wc_order_pending_notif ) ? $notification_settings->wc_order_pending_notif : WooCommerceNotificationsList::mo_get_wc_order_pending_notif();
			} else {
				return;
			}

			if ( is_object( $notification ) && method_exists( $notification, 'send_sms' ) ) {
				$notification->send_sms( array( 'orderDetails' => $order ) );
			}
		}

		/**
		 * Unhook all the emails that we will be sending sms notifications for.
		 *
		 * @param WC_Emails $email_class the class to disable notification for.
		 */
		private function unhook( $email_class ) {
			// Input validation for email class.
			if ( ! is_object( $email_class ) || ! isset( $email_class->emails ) || ! is_array( $email_class->emails ) ) {
				return;
			}

			$new_order_email  = array( $email_class->emails['WC_Email_New_Order'], 'trigger' );
			$processing_order = array( $email_class->emails['WC_Email_Customer_Processing_Order'], 'trigger' );
			$completed_order  = array( $email_class->emails['WC_Email_Customer_Completed_Order'], 'trigger' );
			$new_customer     = array( $email_class->emails['WC_Email_Customer_Note'], 'trigger' );

			remove_action( 'woocommerce_low_stock_notification', array( $email_class, 'low_stock' ) );
			remove_action( 'woocommerce_no_stock_notification', array( $email_class, 'no_stock' ) );
			remove_action( 'woocommerce_product_on_backorder_notification', array( $email_class, 'backorder' ) );
			remove_action( 'woocommerce_order_status_pending_to_processing_notification', $new_order_email );
			remove_action( 'woocommerce_order_status_pending_to_completed_notification', $new_order_email );
			remove_action( 'woocommerce_order_status_pending_to_on-hold_notification', $new_order_email );
			remove_action( 'woocommerce_order_status_failed_to_processing_notification', $new_order_email );
			remove_action( 'woocommerce_order_status_failed_to_completed_notification', $new_order_email );
			remove_action( 'woocommerce_order_status_failed_to_on-hold_notification', $new_order_email );
			remove_action( 'woocommerce_order_status_pending_to_processing_notification', $processing_order );
			remove_action( 'woocommerce_order_status_pending_to_on-hold_notification', $processing_order );
			remove_action( 'woocommerce_order_status_completed_notification', $completed_order );
			remove_action( 'woocommerce_new_customer_note_notification', $new_customer );
		}

		/**
		 * Add a meta box in the order page so that customer can send custom messages to
		 * the users if he wants to.
		 */
		public function add_custom_msg_meta_box() {
			if ( ! class_exists( 'WooCommerce' ) ) {
				return;
			}

			$screen = wc_get_container()->has( CustomOrdersTableController::class ) && wc_get_container()->get( CustomOrdersTableController::class )->custom_orders_table_usage_is_enabled()
				? wc_get_page_screen_id( 'shop-order' )
				: 'shop_order';

			add_meta_box(
				'mo_wc_custom_sms_meta_box',
				'Custom SMS',
				array( $this, 'mo_show_send_custom_msg_box' ),
				$screen,
				'side',
				'default'
			);
		}

		/**
		 * This function is a call back to our meta box hook so that we
		 * can design our metabox and provide our own frontend to the
		 * metabox. In this cases its being used to show a box where
		 * admin can send custom messages to the user.
		 *
		 * @param  array $post_or_order_object - the post or order object passed by WordPress.
		 */
		public function mo_show_send_custom_msg_box( $post_or_order_object ) {
			// Input validation.
			if ( ! is_object( $post_or_order_object ) ) {
				return;
			}

			$order_details = is_a( $post_or_order_object, 'WP_Post' ) ? wc_get_order( $post_or_order_object->ID ) : $post_or_order_object;
			if ( ! is_a( $order_details, 'WC_Order' ) ) {
				return;
			}

			$phone_numbers = MoWcAddOnUtility::get_customer_number_from_order( $order_details );

			// Secure file inclusion with path validation.
			if ( defined( 'MSN_DIR' ) && ! empty( MSN_DIR ) ) {
				$view_file = MSN_DIR . 'views/custom-order-msg.php';
				if ( ! MoUtility::mo_require_file( $view_file, MSN_DIR ) ) {
					return;
				}
				require $view_file;
			} else {
				return;
			}
		}

		/**
		 * This function is used to send custom SMS messages to the user
		 * from the order page of WooCommerce using our meta box.
		 *
		 * @param array $data the posted data.
		 */
		private function send_custom_order_msg( $data ) {
			// Enhanced input validation.
			if ( ! is_array( $data ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoWcAddOnMessages::showMessage( MoWcAddOnMessages::INVALID_PHONE ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
				return;
			}

			if ( ! array_key_exists( 'numbers', $data ) || MoUtility::is_blank( sanitize_text_field( wp_unslash( $data['numbers'] ) ) ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoWcAddOnMessages::showMessage( MoWcAddOnMessages::INVALID_PHONE ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
				return;
			}

			if ( ! array_key_exists( 'msg', $data ) || MoUtility::is_blank( sanitize_textarea_field( wp_unslash( $data['msg'] ) ) ) ) {
				wp_send_json(
					MoUtility::create_json(
						MoWcAddOnMessages::showMessage( MoWcAddOnMessages::INVALID_PHONE ),
						MoConstants::ERROR_JSON_TYPE
					)
				);
				return;
			}

			$numbers = sanitize_text_field( wp_unslash( $data['numbers'] ) );
			$message = sanitize_textarea_field( wp_unslash( $data['msg'] ) );
			$results = array();
			foreach ( explode( ';', $numbers ) as $number ) {
				$number = sanitize_text_field( wp_unslash( trim( $number ) ) );
				if ( empty( $number ) ) {
					continue;
				}

				$ok        = MoUtility::send_phone_notif( $number, $message );
				$results[] = array(
					'number'  => $number,
					'status'  => $ok ? 'success' : 'error',
					'message' => $ok
						? MoWcAddOnMessages::showMessage( MoWcAddOnMessages::SMS_SENT_SUCCESS )
						: MoWcAddOnMessages::showMessage( MoWcAddOnMessages::ERROR_SENDING_SMS ),
				);
			}
			wp_send_json( array( 'results' => $results ) );
		}

		/** Set Addon Key */
		public function set_addon_key() {
		}

		/** Set AddOn Desc */
		public function set_add_on_desc() {
		}

		/** Set an AddOnName */
		public function set_add_on_name() {
		}

		/** Set an Addon Docs link */
		public function set_add_on_docs() {
			$this->add_on_docs = MoFormDocs::WOCOMMERCE_SMS_NOTIFICATION_LINK['guideLink'];
		}

		/** Set an Addon Video link */
		public function set_add_on_video() {
			$this->add_on_video = MoFormDocs::WOCOMMERCE_SMS_NOTIFICATION_LINK['videoLink'];
		}

		/** Set Settings Page URL */
		public function set_settings_url() {
			$base_url           = admin_url( 'admin.php' );
			$this->settings_url = add_query_arg(
				array(
					'addon' => 'woocommerce_notif',
				),
				$base_url
			);
		}
	}
}
