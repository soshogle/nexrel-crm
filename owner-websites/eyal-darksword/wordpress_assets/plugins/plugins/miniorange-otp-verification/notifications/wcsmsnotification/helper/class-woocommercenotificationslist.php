<?php
/**
 * List of Woocommerce Notifications
 *
 * @package miniorange-otp-verification/Notifications/wcsmsnotification/helper
 */

namespace OTP\Notifications\WcSMSNotification\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Helper\MoMessages;
use OTP\Notifications\WcSMSNotification\Helper\Notifications\WooCommerceAdminOrderstatusNotification;
use OTP\Notifications\WcSMSNotification\Helper\Notifications\WooCommerceCutomerNoteNotification;
use OTP\Notifications\WcSMSNotification\Helper\Notifications\WooCommerceNewCustomerNotification;
use OTP\Notifications\WcSMSNotification\Helper\Notifications\WooCommerceOrderCancelledNotification;
use OTP\Notifications\WcSMSNotification\Helper\Notifications\WooCommerceOrderCompletedNotification;
use OTP\Notifications\WcSMSNotification\Helper\Notifications\WooCommerceOrderFailedNotification;
use OTP\Notifications\WcSMSNotification\Helper\Notifications\WooCommerceOrderOnHoldNotification;
use OTP\Notifications\WcSMSNotification\Helper\Notifications\WooCommerceOrderPendingNotification;
use OTP\Notifications\WcSMSNotification\Helper\Notifications\WooCommerceOrderProcessingNotification;
use OTP\Notifications\WcSMSNotification\Helper\Notifications\WooCommerceOrderRefundedNotification;
use OTP\Notifications\WcSMSNotification\Helper\Notifications\WooCommerceProductLowStockNotification;
use OTP\Notifications\WcSMSNotification\Helper\Notifications\WooCommerceProductOutOfStockNotification;
use OTP\Traits\Instance;
use OTP\Helper\MoUtility;
use Exception;

/**
 * This class is used to list down all the WooCommerce Notifications and initialize
 * each of the Notification classes so that it's accessible plugin wide. This
 * class is basically used to handle all the specific WooCommerce Notification classes.
 */
if ( ! class_exists( 'WooCommerceNotificationsList' ) ) {
	/**
	 * WooCommerceNotificationsList class
	 */
	class WooCommerceNotificationsList {

		use Instance;

		/**
		 * New Customer Notification Class
		 *
		 * @var WooCommerceNewCustomerNotification
		 */
		public $wc_new_customer_notif;

		/**
		 * Customer Note Notification Class
		 *
		 * @var WooCommerceCutomerNoteNotification
		 */
		public $wc_customer_note_notif;

		/**
		 * Admin Order Status Notification Class
		 *
		 * @var WooCommerceAdminOrderstatusNotification
		 */
		public $wc_admin_order_status_notif;

		/**
		 * Order on Hold Notification Class
		 *
		 * @var WooCommerceOrderOnHoldNotification
		 */
		public $wc_order_on_hold_notif;

		/**
		 * Order is processing Notification Class
		 *
		 * @var WooCommerceOrderProcessingNotification
		 */
		public $wc_order_processing_notif;

		/**
		 * Order Completed Notification Class
		 *
		 * @var WooCommerceOrderCompletedNotification
		 */
		public $wc_order_completed_notif;

		/**
		 * Order refunded Notification Class
		 *
		 * @var WooCommerceOrderRefundedNotification
		 */
		public $wc_order_refunded_notif;

		/**
		 * Order Cancelled Notification Class
		 *
		 * @var WooCommerceOrderCancelledNotification
		 */
		public $wc_order_cancelled_notif;

		/**
		 * Order Failed Notification Class
		 *
		 * @var WooCommerceOrderFailedNotification
		 */
		public $wc_order_failed_notif;

		/**
		 * Order Pending Notification Class
		 *
		 * @var WooCommerceOrderPendingNotification
		 */
		public $wc_order_pending_notif;

		/**
		 * Low Stock Notification Class
		 *
		 * @var WooCommerceProductLowStockNotification
		 */
		public $wc_product_is_in_low_stock_notif;

		/**
		 * Out of Stock Notification Class
		 *
		 * @var WooCommerceProductOutOfStockNotification
		 */
		public $wc_product_is_out_of_stock_notif;

		/** Declare Default variables */

		/**
		 * This function is used to get the instance of the WooCommerceNotificationsList class.
		 *
		 * @return WooCommerceNotificationsList Object containing the instance of the class.
		 */
		public static function mo_otp_get_instance() {
			// Secure file inclusion for optional notification classes.
			self::mo_initialize_optional_notifications();
			return (object) array(
				'wc_new_customer_notif'       => WooCommerceNewCustomerNotification::mo_otp_get_instance(),
				'wc_customer_note_notif'      => WooCommerceCutomerNoteNotification::mo_otp_get_instance(),
				'wc_admin_order_status_notif' => WooCommerceAdminOrderstatusNotification::mo_otp_get_instance(),
				'wc_order_on_hold_notif'      => WooCommerceOrderOnHoldNotification::mo_otp_get_instance(),
				'wc_order_processing_notif'   => WooCommerceOrderProcessingNotification::mo_otp_get_instance(),
				'wc_order_completed_notif'    => WooCommerceOrderCompletedNotification::mo_otp_get_instance(),
				'wc_order_refunded_notif'     => WooCommerceOrderRefundedNotification::mo_otp_get_instance(),
				'wc_order_cancelled_notif'    => WooCommerceOrderCancelledNotification::mo_otp_get_instance(),
				'wc_order_failed_notif'       => WooCommerceOrderFailedNotification::mo_otp_get_instance(),
				'wc_order_pending_notif'      => WooCommerceOrderPendingNotification::mo_otp_get_instance(),
			);
		}

		/**
		 * Securely initialize optional notification classes
		 *
		 * @return void
		 */
		protected static function mo_initialize_optional_notifications() {
			// Validate MSN_DIR constant.
			if ( ! defined( 'MSN_DIR' ) || empty( MSN_DIR ) ) {
				return;
			}
			// Secure file inclusion for low stock notification.
			$low_stock_file = MSN_DIR . 'helper/notifications/class-woocommerceproductlowstocknotification.php';
			if ( ! MoUtility::mo_require_file( $low_stock_file, MSN_DIR ) ) {
				return;
			}

			$this->wc_product_is_in_low_stock_notif = WooCommerceProductLowStockNotification::getInstance();

			// Secure file inclusion for out of stock notification.
			$out_stock_file = MSN_DIR . 'helper/notifications/class-woocommerceproductoutofstocknotification.php';
			if ( ! MoUtility::mo_require_file( $out_stock_file, MSN_DIR ) ) {
				return;
			}

			$this->wc_product_is_out_of_stock_notif = WooCommerceProductOutOfStockNotification::getInstance();
		}

		/**
		 * Getter function of the $wc_new_customer_notif. Returns the instance
		 * of the WooCommerceNewCustomerNotification class.
		 *
		 * @return WooCommerceNewCustomerNotification|null
		 */
		public static function mo_get_wc_new_customer_notif() {
			return WooCommerceNewCustomerNotification::mo_otp_get_instance();
		}

		/**
		 * Getter function of the $wc_customer_note_notif. Returns the instance
		 * of the WooCommerceCutomerNoteNotification class.
		 *
		 * @return WooCommerceCutomerNoteNotification|null
		 */
		public static function mo_get_wc_customer_note_notif() {
			return WooCommerceCutomerNoteNotification::mo_otp_get_instance();
		}

		/**
		 * Getter function of the $wc_admin_order_status_notif. Returns the instance
		 * of the WooCommerceAdminOrderstatusNotification class.
		 *
		 * @return WooCommerceAdminOrderstatusNotification|null
		 */
		public static function mo_get_wc_admin_order_status_notif() {
			return WooCommerceAdminOrderstatusNotification::mo_otp_get_instance();
		}

		/**
		 * Getter function of the $wc_order_on_hold_notif. Returns the instance
		 * of the WooCommerceOrderOnHoldNotification class.
		 *
		 * @return WooCommerceOrderOnHoldNotification|null
		 */
		public static function mo_get_wc_order_on_hold_notif() {
			// Admin-only gate to avoid blocking front-end/cron; allow admins and shop managers.
			if ( ! MoUtility::mo_check_admin_capability( array( 'manage_options', 'manage_woocommerce', 'edit_shop_orders' ), true ) ) {
				return null;
			}

			return WooCommerceOrderOnHoldNotification::mo_otp_get_instance();
		}

		/**
		 * Getter function of the $wc_order_processing_notif. Returns the instance
		 * of the WooCommerceOrderProcessingNotification class.
		 *
		 * @return WooCommerceOrderProcessingNotification|null
		 */
		public static function mo_get_wc_order_processing_notif() {
			return WooCommerceOrderProcessingNotification::mo_otp_get_instance();
		}

		/**
		 * Getter function of the $wc_order_completed_notif. Returns the instance
		 * of the WooCommerceOrderCompletedNotification class.
		 *
		 * @return WooCommerceOrderCompletedNotification|null
		 */
		public static function mo_get_wc_order_completed_notif() {
			// Admin-only gate to avoid blocking front-end/cron; allow admins and shop managers.
			if ( ! MoUtility::mo_check_admin_capability( array( 'manage_options', 'manage_woocommerce', 'edit_shop_orders' ), true ) ) {
				return null;
			}

			return WooCommerceOrderCompletedNotification::mo_otp_get_instance();
		}

		/**
		 * Getter function of the $wc_order_refunded_notif. Returns the instance
		 * of the WooCommerceOrderRefundedNotification class.
		 *
		 * @return WooCommerceOrderRefundedNotification|null
		 */
		public static function mo_get_wc_order_refunded_notif() {
			// Admin-only gate to avoid blocking front-end/cron; allow admins and shop managers.
			if ( ! MoUtility::mo_check_admin_capability( array( 'manage_options', 'manage_woocommerce', 'edit_shop_orders' ), true ) ) {
				return null;
			}

			return WooCommerceOrderRefundedNotification::mo_otp_get_instance();
		}

		/**
		 * Getter function of the $wc_order_cancelled_notif. Returns the instance
		 * of the WooCommerceOrderCancelledNotification class.
		 *
		 * @return WooCommerceOrderCancelledNotification|null
		 */
		public static function mo_get_wc_order_cancelled_notif() {
			// Admin-only gate to avoid blocking front-end/cron; allow admins and shop managers.
			if ( ! MoUtility::mo_check_admin_capability( array( 'manage_options', 'manage_woocommerce', 'edit_shop_orders' ), true ) ) {
				return null;
			}

			return WooCommerceOrderCancelledNotification::mo_otp_get_instance();
		}

		/**
		 * Getter function of the $wc_order_failed_notif. Returns the instance
		 * of the WooCommerceOrderFailedNotification class.
		 *
		 * @return WooCommerceOrderFailedNotification|null
		 */
		public static function mo_get_wc_order_failed_notif() {
			// Admin-only gate to avoid blocking front-end/cron; allow admins and shop managers.
			if ( ! MoUtility::mo_check_admin_capability( array( 'manage_options', 'manage_woocommerce', 'edit_shop_orders' ), true ) ) {
				return null;
			}

			return WooCommerceOrderFailedNotification::mo_otp_get_instance();
		}

		/**
		 * Getter function of the $wc_order_pending_notif. Returns the instance
		 * of the WooCommerceOrderPendingNotification class.
		 *
		 * @return WooCommerceOrderPendingNotification|null
		 */
		public static function mo_get_wc_order_pending_notif() {
			// Admin-only gate to avoid blocking front-end/cron; allow admins and shop managers.
			if ( ! MoUtility::mo_check_admin_capability( array( 'manage_options', 'manage_woocommerce', 'edit_shop_orders' ), true ) ) {
				return null;
			}

			return WooCommerceOrderPendingNotification::mo_otp_get_instance();
		}

		/**
		 * Getter function of the $wc_product_is_in_low_stock_notif. Returns the instance
		 * of the WooCommerceProductLowStockNotification class.
		 *
		 * @return WooCommerceProductLowStockNotification|null
		 */
		public static function mo_get_wc_product_low_stock_notif() {
			return WooCommerceProductLowStockNotification::mo_otp_get_instance();
		}

		/**
		 * Getter function of the $wc_product_is_out_of_stock_notif. Returns the instance
		 * of the WooCommerceProductOutOfStockNotification class.
		 *
		 * @return WooCommerceProductOutOfStockNotification|null
		 */
		public static function mo_get_wc_product_out_of_stock_notif() {
			return WooCommerceProductOutOfStockNotification::mo_otp_get_instance();
		}

		// Legacy getter methods for backward compatibility (deprecated).

		/**
		 * Legacy getter - use mo_get_wc_new_customer_notif() instead
		 *
		 * @deprecated Use mo_get_wc_new_customer_notif() instead
		 * @return WooCommerceNewCustomerNotification|null
		 */
		public static function get_wc_new_customer_notif() {
			return self::mo_get_wc_new_customer_notif();
		}

		/**
		 * Legacy getter - use mo_get_wc_customer_note_notif() instead
		 *
		 * @deprecated Use mo_get_wc_customer_note_notif() instead
		 * @return WooCommerceCutomerNoteNotification|null
		 */
		public static function get_wc_customer_note_notif() {
			return self::mo_get_wc_customer_note_notif();
		}

		/**
		 * Legacy getter - use mo_get_wc_admin_order_status_notif() instead
		 *
		 * @deprecated Use mo_get_wc_admin_order_status_notif() instead
		 * @return WooCommerceAdminOrderstatusNotification|null
		 */
		public static function get_wc_admin_order_status_notif() {
			return self::mo_get_wc_admin_order_status_notif();
		}

		/**
		 * Legacy getter - use mo_get_wc_order_on_hold_notif() instead
		 *
		 * @deprecated Use mo_get_wc_order_on_hold_notif() instead
		 * @return WooCommerceOrderOnHoldNotification|null
		 */
		public static function get_wc_order_on_hold_notif() {
			return self::mo_get_wc_order_on_hold_notif();
		}

		/**
		 * Legacy getter - use mo_get_wc_order_processing_notif() instead
		 *
		 * @deprecated Use mo_get_wc_order_processing_notif() instead
		 * @return WooCommerceOrderProcessingNotification|null
		 */
		public static function get_wc_order_processing_notif() {
			return self::mo_get_wc_order_processing_notif();
		}

		/**
		 * Legacy getter - use mo_get_wc_order_completed_notif() instead
		 *
		 * @deprecated Use mo_get_wc_order_completed_notif() instead
		 * @return WooCommerceOrderCompletedNotification|null
		 */
		public static function get_wc_order_completed_notif() {
			return self::mo_get_wc_order_completed_notif();
		}

		/**
		 * Legacy getter - use mo_get_wc_order_refunded_notif() instead
		 *
		 * @deprecated Use mo_get_wc_order_refunded_notif() instead
		 * @return WooCommerceOrderRefundedNotification|null
		 */
		public static function get_wc_order_refunded_notif() {
			return self::mo_get_wc_order_refunded_notif();
		}

		/**
		 * Legacy getter - use mo_get_wc_order_cancelled_notif() instead
		 *
		 * @deprecated Use mo_get_wc_order_cancelled_notif() instead
		 * @return WooCommerceOrderCancelledNotification|null
		 */
		public static function get_wc_order_cancelled_notif() {
			return self::mo_get_wc_order_cancelled_notif();
		}

		/**
		 * Legacy getter - use mo_get_wc_order_failed_notif() instead
		 *
		 * @deprecated Use mo_get_wc_order_failed_notif() instead
		 * @return WooCommerceOrderFailedNotification|null
		 */
		public static function get_wc_order_failed_notif() {
			return self::mo_get_wc_order_failed_notif();
		}

		/**
		 * Legacy getter - use mo_get_wc_order_pending_notif() instead
		 *
		 * @deprecated Use mo_get_wc_order_pending_notif() instead
		 * @return WooCommerceOrderPendingNotification|null
		 */
		public static function get_wc_order_pending_notif() {
			return self::mo_get_wc_order_pending_notif();
		}

		/**
		 * Legacy getter - use mo_get_wc_product_low_stock_notif() instead
		 *
		 * @deprecated Use mo_get_wc_product_low_stock_notif() instead
		 * @return WooCommerceProductLowStockNotification|null
		 */
		public static function get_wc_product_low_stock_notif() {
			return self::mo_get_wc_product_low_stock_notif();
		}

		/**
		 * Legacy getter - use mo_get_wc_product_out_of_stock_notif() instead
		 *
		 * @deprecated Use mo_get_wc_product_out_of_stock_notif() instead
		 * @return WooCommerceProductOutOfStockNotification|null
		 */
		public static function get_wc_product_out_of_stock_notif() {
			return self::mo_get_wc_product_out_of_stock_notif();
		}
	}
}
