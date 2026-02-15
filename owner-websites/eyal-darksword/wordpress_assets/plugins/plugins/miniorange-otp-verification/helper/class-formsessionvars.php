<?php
/**
 * Load administrator changes for FormSessionVars
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * This function lists down all the session variable names
 * being used in the plugin and turn them into constants.
 */
if ( ! class_exists( 'FormSessionVars' ) ) {
	/**
	 * FormSessionVars class
	 */
	class FormSessionVars {
		const FLUENTFORM                    = 'fluent_form';
		const FLUENT_CONV_FORM              = 'fluent_conv_form';
		const WC_PROFILE_UPDATE             = 'wc_account_form';
		const FORMINATOR                    = 'forminator';
		const EASY_REG_FORM                 = 'mo_easyreg_form';
		const EDUMAREG                      = 'mo_edum_register';
		const EDUMALOG                      = 'mo_edum_login';
		const TX_SESSION_ID                 = 'mo_otp_site_tx_id';
		const WC_DEFAULT_REG                = 'woocommerce_registration';
		const DOKAN_REG                     = 'dokan_registration';
		const WC_CHECKOUT                   = 'woocommerce_checkout_page';
		const WC_NEW_CHECKOUT               = 'woocommerce_new_checkout_page';
		const CHECKOUT_WC                   = 'checkoutWC_page';
		const CHECKOUT_WC_FORM              = 'checkoutWC_form_page';
		const WC_SOCIAL_LOGIN               = 'wc_social_login';
		const PB_DEFAULT_REG                = 'profileBuilder_registration';
		const UM_DEFAULT_REG                = 'ultimate_members_registration';
		const CRF_DEFAULT_REG               = 'crf_user_registration';
		const UULTRA_REG                    = 'uultra_user_registration';
		const SIMPLR_REG                    = 'simplr_registration';
		const BUDDYPRESS_REG                = 'buddyPress_user_registration';
		const PIE_REG                       = 'pie_user_registration';
		const WP_DEFAULT_REG                = 'default_wp_registration';
		const TML_REG                       = 'tml_registration';
		const UPME_REG                      = 'upme_user_registration';
		const USERPRO_FORM                  = 'userpro_form_submit';
		const GF_FORMS                      = 'gf_form';
		const CF7_FORMS                     = 'cf7_contact_page';
		const WP_DEFAULT_LOGIN              = 'default_wp_login';
		const WP_LOGIN_REG_PHONE            = 'default_wp_reg_phone';
		const WPMEMBER_REG                  = 'wp_member_registration';
		const ULTIMATE_PRO                  = 'ultimatepro_verified';
		const CLASSIFY_REGISTER             = 'classify_form';
		const REALESWP_REGISTER             = 'realeswp_form';
		const NINJA_FORM_AJAX               = 'nj_ajax_submit';
		const EMEMBER                       = 'wp_emeber_form';
		const FORMCRAFT                     = 'formcraftform';
		const WPCOMMENT                     = 'wp_comment';
		const DOCDIRECT_REG                 = 'docdirect_theme_registration';
		const WPFORM                        = 'wpform';
		const CALDERA                       = 'caldera';
		const MEMBERPRESS_REG               = 'memberpress_user_registration';
		const MEMBERPRESS_SINGLE_REG        = 'memberpress_single_checkout_user_registration';
		const REALESTATE_7                  = 'realestate7_registration';
		const MULTISITE                     = 'multisite_registration';
		const PMPRO_REGISTRATION            = 'paid_membership_plugin';
		const FORM_MAKER                    = 'form_maker_form';
		const TUTOR_LMS_STUDENT_REG_FORM    = 'tutor_lms_student_registration';
		const TUTOR_LMS_INSTRUCTOR_REG_FORM = 'tutor_lms_instructor_registration';
		const UM_PROFILE_UPDATE             = 'ultimate_member_profile';
		const UM_DEFAULT_PASS               = 'um_password_reset_form';
		const WC_DEFAULT_PASS               = 'wc_password_reset_form';
		const WC_PRODUCT_VENDOR             = 'wc_product_vendor';
		const VISUAL_FORM                   = 'visual_form';
		const FORMIDABLE_FORM               = 'frm_form';
		const WC_BILLING                    = 'wc_billing';
		const WP_CLIENT_REG                 = 'wp_client_registration';
		const CUSTOMFORM                    = 'customform';
		const REG_PHONE_ONLY                = 'register_with_phone_only';
		const WCFM                          = 'mo_wcfm';
		const ELEMENTOR_PRO                 = 'mo_elementor_pro';
		const API_ADDON_SESSION_VAR         = 'api_addon_var';
		const SOCIAL_LOGIN                  = 'social_login';
		const USERREG                       = 'userreg';
		const JETENGINEFORM                 = 'jet_engine_form';
		const EVEREST_CONTACT               = 'everest_contact';
		const PREMIUM_FORMS                 = 'premium_forms';
		const TUTOR_LMS_LOGIN               = 'tutor_lms_login';
		const WP_USER_MANAGER               = 'wp_user_manager';
		const UM_PASS_RESET                 = 'um_pass_reset';
		const AR_MEMBER_FORM                = 'mo_armember';
		const HOUZEZ_REG                    = 'houzez_reg';
		const WP_DEFAULT_PASS               = 'wp_default_pass';
		const JET_BUILDER_FORM              = 'jet_builder_form';
		const MO_WS_FORMS                   = 'mo_ws_form';
		const LOGIN_REGISTER_WITH_PHONE     = 'login_register_with_phone';
		const MO_LOGIN_REG_USING_PHONE_FORM = 'miniOrange - Login and register using phone only';
	}
}
