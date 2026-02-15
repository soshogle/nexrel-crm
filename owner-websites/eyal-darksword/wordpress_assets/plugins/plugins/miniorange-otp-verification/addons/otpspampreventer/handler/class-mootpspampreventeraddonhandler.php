<?php
/**
 * OTP Spam Preventer Handler
 *
 * @package otpspampreventer/handler
 */

namespace OSP\Handler;

use OSP\Handler\MoOtpSpamPreventerHandler;
use OSP\Handler\MoOtpSpamStorage;
use OSP\Handler\MoOtpSpamAjax;
use OSP\Traits\Instance;
use OTP\Objects\BaseAddOnHandler;
use OTP\Helper\AddOnList;
use OTP\Helper\MoUtility;
use OTP\Helper\MoMessages;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! class_exists( 'MoOtpSpamPreventerAddonHandler' ) ) {
	/**
	 * The class is used to handle all OTP Spam Preventer related functionality.
	 */
	class MoOtpSpamPreventerAddonHandler extends BaseAddOnHandler {

		use Instance;

		/**
		 * Constructor checks if add-on has been enabled by the admin and initializes
		 * all the class variables. This function also defines all the hooks to
		 * hook into to make the add-on functionality work.
		 */
		public function __construct() {
			parent::__construct();
			add_action( 'admin_enqueue_scripts', array( $this, 'mo_enqueue_admin_assets' ) );
			if ( ! $this->moAddOnV() ) {
				return;
			}
			MoOtpSpamPreventerHandler::instance();
			MoOtpSpamStorage::instance();
			MoOtpSpamAjax::instance();

			add_action( 'admin_init', array( $this, 'mo_handle_settings_save' ) );
		}

		/**
		 * Set a unique key for the AddOn
		 */
		public function set_addon_key() {
			$this->add_on_key = 'otp_spam_preventer';
		}

		/**
		 * Set a AddOn Description
		 * Store raw string to avoid early translation loading warning.
		 */
		public function set_add_on_desc() {
			$this->add_on_desc = 'Prevents OTP request spamming based on phone number, email, IP address, and browser fingerprint. '
				. 'Click on the settings button to the right to configure settings for the same.';
		}

		/**
		 * Set an AddOnName
		 * Store raw string to avoid early translation loading warning.
		 */
		public function set_add_on_name() {
			$this->addon_name = 'OTP Spam Preventer';
		}

		/**
		 * Return the Addon Description (with lazy translation)
		 *
		 * @return string
		 */
		public function getAddOnDesc() {
			if ( did_action( 'plugins_loaded' ) ) {
				// phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText -- Dynamic translation needed for lazy loading.
				return __( $this->add_on_desc, 'miniorange-otp-verification' );
			}
			return $this->add_on_desc;
		}

		/**
		 * Return AddOn Name (with lazy translation)
		 *
		 * @return string
		 */
		public function get_add_on_name() {
			if ( did_action( 'plugins_loaded' ) ) {
				// phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText -- Dynamic translation needed for lazy loading.
				return __( $this->addon_name, 'miniorange-otp-verification' );
			}
			return $this->addon_name;
		}

		/**
		 * Set Settings Page URL
		 */
		public function set_settings_url() {
			$req_url            = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- esc_url_raw() handles sanitization.
			$this->settings_url = add_query_arg( array( 'addon' => 'otp_spam_preventer' ), $req_url );
		}

		/**
		 * Set an Addon Docs link
		 */
		public function set_add_on_docs() {}

		/**
		 * Set an Addon Video link
		 */
		public function set_add_on_video() {}

		/**
		 * Handle settings save POST request.
		 *
		 * @return void
		 */
		public function mo_handle_settings_save() {
			if ( ! isset( $_POST['option'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing -- false positive.
				return;
			}

			$option = sanitize_text_field( wp_unslash( $_POST['option'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Missing -- false positive.
			if ( 'mo_osp_settings_save' !== $option ) {
				return;
			}

			check_admin_referer( 'mo_osp_settings_save' );

			if ( ! current_user_can( 'manage_options' ) ) {
				wp_die( esc_html( MoMessages::showMessage( MoMessages::INSUFFICIENT_PERMISSIONS ) ) );
			}

			$handler = MoOtpSpamPreventerHandler::instance();
			$posted  = MoUtility::mo_sanitize_array( $_POST ); // phpcs:ignore WordPress.Security.NonceVerification.Missing -- sanitized within the function.
			$result  = $handler->mosp_save_settings( $posted );

			$message_type = $result['success'] ? 'SUCCESS' : 'ERROR';
			do_action( 'mo_registration_show_message', $result['message'], $message_type );
		}

		/**
		 * Enqueue admin assets.
		 *
		 * @param string $hook_suffix Current admin page hook suffix. Not used but required by hook signature.
		 * @return void
		 */
		public function mo_enqueue_admin_assets( $hook_suffix ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter -- Required by admin_enqueue_scripts hook signature.
			if ( ! isset( $_GET['addon'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.NonceVerification.Recommended -- Reading GET parameter for checking the addon name, doesn't require nonce verification.
				return;
			}

			$addon = sanitize_text_field( wp_unslash( $_GET['addon'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.NonceVerification.Recommended -- Reading GET parameter for checking the addon name, doesn't require nonce verification.
			if ( 'otp_spam_preventer' !== $addon ) {
				return;
			}

			wp_enqueue_style( 'mo-osp-admin', MO_OSP_URL . 'includes/css/mo-admin.css', array(), '1.6.0' );
			wp_enqueue_script( 'mo-osp-admin', MO_OSP_URL . 'includes/js/spam-preventer-admin.js', array( 'jquery' ), '1.0.0', true );
			wp_localize_script(
				'mo-osp-admin',
				'mo_osp_admin_ajax',
				array(
					'ajax_url' => admin_url( 'admin-ajax.php' ),
					'nonce'    => wp_create_nonce( 'mo_osp_admin_nonce' ),
				)
			);
		}
	}
}
