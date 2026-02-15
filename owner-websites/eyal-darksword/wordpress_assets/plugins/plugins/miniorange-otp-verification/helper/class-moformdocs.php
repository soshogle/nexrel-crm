<?php
/**
 * Load administrator changes for MoFormDocs
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * This function is used to show docs links for forms in WordPress.
 */
if ( ! class_exists( 'MoFormDocs' ) ) {
	/**
	 * MoFormDocs class
	 */
	class MoFormDocs {

		const CUSTOM_MESSAGES_ADDON_LINK = array(
			'guideLink' => 'https://plugins.miniorange.com/wordpress-otp-verification',
			'videoLink' => 'https://www.youtube.com/watch?v=atlyqTy8RHI&ab_channel=miniOrange',
		);

		const ULTIMATEMEMBER_SMS_NOTIFICATION_LINK = array(
			'guideLink' => 'https://plugins.miniorange.com/wordpress-otp-verification',
			'videoLink' => 'https://www.youtube.com/watch?v=atlyqTy8RHI&ab_channel=miniOrange',
		);

		const WOCOMMERCE_SMS_NOTIFICATION_LINK         = array(
			'guideLink' => 'https://plugins.miniorange.com/wordpress-otp-verification',
			'videoLink' => 'https://www.youtube.com/watch?v=atlyqTy8RHI&ab_channel=miniOrange',
		);
		const SELECTED_COUNTRY_CODE_ADDON_LINK         = array(
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-selected-countries',
			'videoLink' => '',
		);
		const WOOCOMMERCE_PASSWORD_RESET_ADDON_LINK    = array(
			'guideLink' => 'https://plugins.miniorange.com/how-to-configure-woocommerce-password-reset-addon',
			'videoLink' => '',
		);
		const LIMIT_OTP_REQUEST_ADDON_LINK             = array(
			'guideLink' => 'https://plugins.miniorange.com/how-to-configure-limit-otp-request-addon',
			'videoLink' => '',
		);
		const REGISTER_WITH_PHONE_ADDON_LINK           = array(
			'guideLink' => 'https://plugins.miniorange.com/how-to-configure-register-using-only-phone-addon',
			'videoLink' => '',
		);
		const WOOCOMMERCE_SELECTED_CATEGORY_ADDON_LINK = array(
			'guideLink' => '',
			'videoLink' => '',
		);
		const GEOLOCATION_COUNTRY_CODE_ADDON_LINK      = array(
			'guideLink' => 'https://plugins.miniorange.com/geolocation-ip-base-country-code-dropdown',
			'videoLink' => '',
		);
		const WORDPRESS_PASSWORD_RESET_ADDON_LINK      = array(
			'guideLink' => 'https://plugins.miniorange.com/how-to-configure-wordpress-password-reset-addon',
			'videoLink' => '',
		);

		const OTP_OVER_CALL_TWILIO_ADDON_LINK = array(
			'guideLink' => 'https://plugins.miniorange.com/how-to-configure-otp-over-call-addon',
			'videoLink' => '',
		);

		const WP_DEFAULT_FORM_LINK = array(
			'formLink'  => '',
			'guideLink' => 'https://plugins.miniorange.com/configure-one-time-password-verification-wordpress-default-tml-registration-form/',
			'videoLink' => 'https://youtu.be/3l_3eR4XD_s',
		);
		const PB_FORM_LINK         = array(
			'formLink'  => 'https://wordpress.org/plugins/profile-builder/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-profile-builder-registration-form',
			'videoLink' => 'https://www.youtube.com/watch?v=QwU1o3mpjPE',
		);
		const WC_FORM_LINK         = array(
			'formLink'  => 'https://wordpress.org/plugins/woocommerce/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-woocommerce-registration-form/',
			'videoLink' => 'https://youtu.be/CvmrMVBAM5A',
		);
		const WC_CHECKOUT_LINK     = array(
			'formLink'  => 'https://wordpress.org/plugins/woocommerce/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-woocommerce-checkout-form/',
			'videoLink' => 'https://youtu.be/atlyqTy8RHI',
		);
		const WC_NEW_CHECKOUT_LINK = array(
			'formLink'  => 'https://wordpress.org/plugins/woocommerce/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-woocommerce-checkout-form/',
			'videoLink' => '',
		);
		const CHECKOUT_WC_LINK     = array(
			'formLink'  => 'https://www.checkoutwc.com/?gclid=CjwKCAjwu5yYBhAjEiwAKXk_eLeOXFTEDLoRmT8Jht4msy0OKoPBHu2l6HqIx1tbvts5CFrEVRd5mhoCBzgQAvD_BwE',
			'guideLink' => 'https://plugins.miniorange.com/checkout-wc-form-setup-for-wordpress-otp',
			'videoLink' => '',
		);

		const WC_BILLING_LINK                = array(
			'formLink'  => 'https://wordpress.org/plugins/woocommerce/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-woocommerce-billing-address-update-form/',
			'videoLink' => 'https://youtu.be/4q1rKeiPKvw',
		);
		const WC_PROFILE_UPDATE_FORM_LINK    = array(
			'formLink'  => 'https://wordpress.org/plugins/woocommerce/',
			'guideLink' => 'https://plugins.miniorange.com/woocommerce-account-detail-form-setup-otp-wordpress',
			'videoLink' => '',
		);
		const SIMPLR_FORM_LINK               = array(
			'formLink'  => 'https://wordpress.org/plugins/simplr-registration-form/',
			'guideLink' => '',
			'videoLink' => 'https://www.youtube.com/watch?v=TKzmBmc2nQc',
		);
		const UM_ENABLED                     = array(
			'formLink'  => 'https://wordpress.org/plugins/ultimate-member/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-ultimate-member-registration-form/',
			'videoLink' => 'https://youtu.be/T2HwjFYDyMY',
		);
		const UM_PROFILE                     = array(
			'formLink'  => 'https://wordpress.org/plugins/ultimate-member/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-ultimate-member-profileaccount-form/',
			'videoLink' => 'https://youtu.be/vS1TD0quruQ',
		);
		const EVENT_FORM                     = array(
			'formLink'  => 'https://wordpress.org/plugins/event-registration/',
			'guideLink' => '',
			'videoLink' => '',
		);
		const BBP_FORM_LINK                  = array(
			'formLink'  => 'https://wordpress.org/plugins/buddypress/',
			'guideLink' => 'https://plugins.miniorange.com/configure-one-time-password-verification-buddypress-registration-form/',
			'videoLink' => 'https://youtu.be/i5t7jV3H8IE',
		);
		const CRF_FORM_ENABLE                = array(
			'formLink'  => 'https://wordpress.org/plugins/custom-registration-form-builder-with-submission-manager/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-custom-user-registration-form-builder-registration-magic',
			'videoLink' => 'https://www.youtube.com/watch?v=iadNfXV5ARo',
		);
		const UULTRA_FORM_LINK               = array(
			'formLink'  => 'https://wordpress.org/plugins/users-ultra/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-user-ultra-registration-form',
			'videoLink' => 'https://www.youtube.com/watch?v=2cVcf-6pZBc',
		);
		const UPME_FORM_LINK                 = array(
			'formLink'  => 'https://codecanyon.net/item/user-profiles-made-easy-wordpress-plugin/4109874',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-userprofile-made-easy-registration-form',
			'videoLink' => 'https://www.youtube.com/watch?v=sw0MgNIIVP0',
		);
		const PIE_FORM_LINK                  = array(
			'formLink'  => 'https://pieregister.com/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-pie-registration-form/',
			'videoLink' => 'https://www.youtube.com/watch?v=Xp5CfjIfkHM',
		);
		const CF7_FORM_LINK                  = array(
			'formLink'  => 'https://wordpress.org/plugins/contact-form-7/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-contact-form-7/',
			'videoLink' => 'https://youtu.be/mHIMdnpevNo&t',
		);
		const WC_SOCIAL_LOGIN                = array(
			'formLink'  => 'https://woocommerce.com/products/woocommerce-social-login/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-woocommerce-social-login',
			'videoLink' => '',
		);
		const NINJA_FORMS_AJAX_LINK          = array(
			'formLink'  => 'https://ninjaforms.com/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-ninja-forms-version-3-0',
			'videoLink' => 'https://youtu.be/bh3X46a-bDE',
		);
		const TUTOR_LMS_INSTRUCTOR_FORM_LINK = array(
			'formLink'  => 'https://wordpress.org/plugins/tutor/',
			'guideLink' => 'https://plugins.miniorange.com/tutor-lms-Instructor-registration-otp-verification',
			'videoLink' => '',
		);
		const TUTOR_LMS_STUDENT_FORM_LINK    = array(
			'formLink'  => 'https://wordpress.org/plugins/tutor/',
			'guideLink' => 'https://plugins.miniorange.com/tutor-lms-student-registration-otp-verification',
			'videoLink' => '',
		);
		const TML_FORM_LINK                  = array(
			'formLink'  => 'https://wordpress.org/plugins/theme-my-login/',
			'guideLink' => '',
			'videoLink' => '',
		);

		const USERPRO_FORM_LINK      = array(
			'formLink'  => 'https://codecanyon.net/item/userpro-user-profiles-with-social-login/5958681',
			'guideLink' => 'https://plugins.miniorange.com/userpro-form-wordpress-otp-authentication',
			'videoLink' => '',
		);
		const GF_FORM_LINK           = array(
			'formLink'  => 'https://www.gravityforms.com/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-gravity-form',
			'videoLink' => 'https://youtu.be/9WuyEUTMwQ4',
		);
		const WP_MEMBER_LINK         = array(
			'formLink'  => 'https://wordpress.org/plugins/wp-members/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-wp-member',
			'videoLink' => 'https://www.youtube.com/watch?v=0suFBcC1NW4',
		);
		const UM_PRO_LINK            = array(
			'formLink'  => 'https://codecanyon.net/item/ultimate-membership-pro-wordpress-plugin/12159253',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-ultimate-membership-pro-form',
			'videoLink' => '',
		);
		const CLASSIFY_LINK          = array(
			'formLink'  => 'https://themeforest.net/item/classify-classified-ads-html-template/11013666',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-classify-theme-registration-form',
			'videoLink' => 'https://www.youtube.com/watch?v=w_GB3-OU_o0',
		);
		const REALES_THEME           = array(
			'formLink'  => 'https://themeforest.net/item/reales-wp-real-estate-wordpress-theme/10330568',
			'guideLink' => '',
			'videoLink' => '',
		);
		const EMEMBER_FORM_LINK      = array(
			'formLink'  => 'https://www.tipsandtricks-hq.com/wordpress-emember-easy-to-use-wordpress-membership-plugin-1706',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-wp-emember',
			'videoLink' => 'https://www.youtube.com/watch?v=W-YuTqkR53w',
		);
		const FORMCRAFT_BASIC_LINK   = array(
			'formLink'  => 'https://wordpress.org/plugins/formcraft-form-builder/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-formcraft-basic-free-version',
			'videoLink' => 'https://www.youtube.com/watch?v=VfegYWlkysU',
		);
		const FORMCRAFT_PREMIUM      = array(
			'formLink'  => 'https://codecanyon.net/item/formcraft-premium-wordpress-form-builder/5335056',
			'guideLink' => 'https://plugins.miniorange.com/formcraft-premium-form-using-one-time-password-verification',
			'videoLink' => '',
		);
		const DOCDIRECT_THEME        = array(
			'formLink'  => 'https://themeforest.net/item/docdirect-responsive-directory-wordpress-theme-for-doctors-and-healthcare-profession/16089820',
			'guideLink' => '',
			'videoLink' => 'https://www.youtube.com/watch?v=Bv3RKJhKW0o',
		);
		const WP_FORMS_LINK          = array(
			'formLink'  => 'https://wordpress.org/plugins/wpforms-lite/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-wp-forms',
			'videoLink' => 'https://youtu.be/dWjEjjN-aws',
		);
		const CALDERA_FORMS_LINK     = array(
			'formLink'  => 'https://wordpress.org/plugins/caldera-forms/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-caldera-form/',
			'videoLink' => 'https://www.youtube.com/watch?v=-npTzjDYk7E',
		);
		const MRP_FORM_LINK          = array(
			'formLink'  => 'https://memberpress.com/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-memberpress-registration-form/',
			'videoLink' => '',
		);
		const REALESTATE7_THEME_LINK = array(
			'formLink'  => 'https://themeforest.net/item/wp-pro-real-estate-7-responsive-real-estate-wordpress-theme/12473778',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-real-estate-7-pro-theme',
			'videoLink' => '',
		);
		const PAID_MEMBERSHIP_PRO    = array(
			'formLink'  => 'https://wordpress.org/plugins/paid-memberships-pro/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-paid-membership-pro-registration-form',
			'videoLink' => 'https://www.youtube.com/watch?v=UWQKTEAS5H8',
		);
		const FORMMAKER              = array(
			'formLink'  => 'https://wordpress.org/plugins/form-maker/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-form-maker-form',
			'videoLink' => '',
		);
		const WC_PRODUCT_VENDOR      = array(
			'formLink'  => 'https://woocommerce.com/products/product-vendors/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-woocommerce-product-vendor-registration-form',
			'videoLink' => '',
		);
		const FORMIDABLE_FORM_LINK   = array(
			'formLink'  => 'https://wordpress.org/plugins/formidable/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-formidable-form/',
			'videoLink' => 'https://youtu.be/sg42qCz-mw4',
		);
		const VISUAL_FORM_LINK       = array(
			'formLink'  => 'https://wordpress.org/plugins/visual-form-builder/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-visual-form-builder/',
			'videoLink' => 'https://youtu.be/tR_4eBpWYCM',
		);
		const MULTISITE_REG_FORM     = array(
			'formLink'  => '',
			'guideLink' => '',
			'videoLink' => '',
		);
		const DOKAN_FORM_LINK        = array(
			'formLink'  => 'https://wordpress.org/plugins/dokan-lite/',
			'guideLink' => 'https://plugins.miniorange.com/dokan-registration-form-setup-for-otp-verification-wordpress',
			'videoLink' => '',
		);
		const WP_COMMENT_LINK        = array(
			'formLink'  => '',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-wordpress-comment-form',
			'videoLink' => 'https://www.youtube.com/watch?v=LUt5HD04aeg',
		);
		const LOGIN_FORM             = array(
			'formLink'  => '',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-login-form',
			'videoLink' => 'https://youtu.be/c8nNyVQ9-gY',
		);
		const WP_CLIENT_FORM         = array(
			'formLink'  => 'https://wp-client.com/',
			'guideLink' => '',
			'videoLink' => '',
		);
		const WCFM_FORM              = array(
			'formLink'  => 'https://wordpress.org/plugins/wc-frontend-manager/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-woocommerce-frontend-manager-form',
			'videoLink' => '',
		);

		const SOCIAL_LOGIN = array(
			'formLink'  => 'https://wordpress.org/plugins/miniorange-login-openid/',
			'guideLink' => 'https://plugins.miniorange.com/enable-otp-verification-with-social-login',
			'videoLink' => 'https://www.youtube.com/watch?v=YHQF5sdrLnY&t=1s',
		);

		const ELEMENTORPRO_FORMS_LINK = array(
			'formLink'  => 'https://wordpress.org/plugins/elementor/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-elementor-pro-form',
			'videoLink' => 'https://youtu.be/NcTtiWbw_do',
		);
		const EDUMA_LOG               = array(
			'formLink'  => 'https://themeforest.net/item/education-wordpress-theme-education-wp/14058034',
			'guideLink' => 'https://plugins.miniorange.com/eduma-theme-login-form-setup-otp-wordpress',
			'videoLink' => '',
		);

		const EDUMA_REG = array(
			'formLink'  => 'https://themeforest.net/item/education-wordpress-theme-education-wp/14058034',
			'guideLink' => 'https://plugins.miniorange.com/eduma-theme-registration-form-setup-otp-wordpress',
			'videoLink' => '',
		);

		const USER_REG_FORMS = array(
			'formLink'  => 'https://wordpress.org/plugins/user-registration/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-user-registration-form',
			'videoLink' => '',
		);
		const EASYREG_FORM   = array(
			'formLink'  => 'https://wordpress.org/plugins/easy-registration-forms/',
			'guideLink' => '',
			'videoLink' => '',
		);

		const JETENGINE_FORM_LINK       = array(
			'formLink'  => 'https://crocoblock.com/plugins/jetengine/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-jet-engine-form-wordpress',
			'videoLink' => '',
		);
		const EVEREST_CONTACT_FORM_LINK = array(
			'formLink'  => 'https://wordpress.org/plugins/everest-forms/',
			'guideLink' => 'https://plugins.miniorange.com/otp-verification-for-everest-contact-form-wordpress-otp',
			'videoLink' => '',
		);
		const FORMINATOR_FORM_LINK      = array(
			'formLink'  => 'https://wordpress.org/plugins/forminator/',
			'guideLink' => 'https://plugins.miniorange.com/wordpress-otp-verification-for-forminator-forms',
			'videoLink' => '',
		);

		const TUTOR_LMS_LOGIN_FORM_LINK = array(
			'formLink'  => 'https://www.themeum.com/product/tutor-lms/',
			'guideLink' => 'https://plugins.miniorange.com/tutor-lms-login-otp-verification',
			'videoLink' => '',
		);

		const UM_PASS_RESET_FORM_LINK = array(
			'formLink'  => '',
			'guideLink' => 'https://plugins.miniorange.com/ultimate-member-password-reset-otp-verification',
			'videoLink' => 'https://www.youtube.com/watch?v=atlyqTy8RHI&ab_channel=miniOrange',
		);

		const WP_USER_MANAGER_FORMS_LINK = array(
			'formLink'  => 'https://wordpress.org/plugins/wp-user-manager/',
			'guideLink' => 'https://plugins.miniorange.com/wp-user-manager-registration-form-otp-verification',
			'videoLink' => '',
		);

		const PREMIUM_FORM_LINK         = array(
			'formLink'  => '',
			'guideLink' => '',
			'videoLink' => '',
		);
		const AR_MEMBER_FORM_LINK       = array(
			'formLink'  => 'https://wordpress.org/plugins/armember-membership/',
			'guideLink' => 'https://plugins.miniorange.com/armember-registration-form-otp-verification-wordpress',
			'videoLink' => '',
		);
		const HOUZEZ_REG_LINK           = array(
			'formLink'  => 'https://themeforest.net/item/houzez-real-estate-wordpress-theme/15752549',
			'guideLink' => 'https://plugins.miniorange.com/setup-otp-verification-for-houzez-registration-form',
			'videoLink' => '',
		);
		const JETFORM_BUILDER_LINK      = array(
			'formLink'  => 'https://crocoblock.com/plugins/jetformbuilder/',
			'guideLink' => 'https://plugins.miniorange.com/jetformbuilder-crocoblock-setup-for-otp-verification',
			'videoLink' => '',
		);
		const FLUENT_FORM_LINK          = array(
			'formLink'  => 'https://fluentforms.com/',
			'guideLink' => 'https://plugins.miniorange.com/wordpress-fluent-form-with-otp-verification',
			'videoLink' => '',
		);
		const WS_FORM_LINK              = array(
			'formLink'  => 'https://wsform.com/',
			'guideLink' => 'https://plugins.miniorange.com/ws-form-setup-for-otp-verification',
			'videoLink' => '',
		);
		const LOGIN_REGISTER_WITH_PHONE = array(
			'formLink'  => '',
			'guideLink' => 'https://plugins.miniorange.com/register-login-account-phone-miniorange-otp',
			'videoLink' => '',
		);
	}
}
