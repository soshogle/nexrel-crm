<?php
/**
 * Load administrator changes for MoConstants
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * This class lists down all the OTP Constant variables.
 */
if ( ! class_exists( 'MoConstants' ) ) {
	/**
	 * MoConstants class
	 */
	class MoConstants {

		const COUNTRY_BLOCKED_ERROR  = 'COUNTRY_BLOCKED_ERROR';
		const HOSTNAME               = MOV_HOST;
		const DEFAULT_CUSTOMER_KEY   = MOV_DEFAULT_CUSTOMERKEY;
		const DEFAULT_API_KEY        = MOV_DEFAULT_APIKEY;
		const WP_HOST                = 'https://graph.facebook.com/v17.0/';
		const PCODE                  = 'UHJlbWl1bSBQbGFuIC0gV1AgT1RQIFZFUklGSUNBVElPTg==';
		const BCODE                  = 'RG8gaXQgWW91cnNlbGYgUGxhbiAtIFdQIE9UUCBWRVJJRklDQVRJT04=';
		const CCODE                  = 'bWluaU9yYW5nZSBTTVMvU01UUCBHYXRld2F5IC0gV1AgT1RQIFZFUklGSUNBVElPTg==';
		const NCODE                  = 'd3Bfb3RwX3ZlcmlmaWNhdGlvbl9iYXNpY19wbGFu';
		const AACODE                 = 'Q3VzdG9tIEdhdGV3YXkgd2l0aCBBZGRPbnMtIFdQIE9UUCBWZXJpZmljYXRpb24=';
		const AACODE2                = 'd3BfZW1haWxfdmVyaWZpY2F0aW9uX2ludHJhbmV0X2Jhc2ljX3BsYW4=';
		const AACODE3                = 'WW91ciBHYXRld2F5IC0gV1AgT1RQIFZlcmlmaWNhdGlvbg==';
		const TACODE                 = 'd3BfZW1haWxfdmVyaWZpY2F0aW9uX2ludHJhbmV0X3R3aWxpb19iYXNpY19wbGFu';
		const TACODE2                = 'd3BfZW1haWxfdmVyaWZpY2F0aW9uX2ludHJhbmV0X3R3aWxpbw==';
		const TACODE3                = 'VHdpbGlvIEdhdGV3YXkgLSBXUCBPVFAgVmVyaWZpY2F0aW9u';
		const NACODE                 = 'Q3VzdG9tIEdhdGV3YXkgd2l0aG91dCBBZGRPbnMgLSBXUCBPVFAgVmVyaWZpY2F0aW9u';
		const NACODE2                = 'd3BfZW1haWxfdmVyaWZpY2F0aW9uX2ludHJhbmV0X3N0YW5kYXJkX3BsYW4=';
		const ECODE                  = 'd3BfZW1haWxfdmVyaWZpY2F0aW9uX2ludHJhbmV0X2VudGVycHJpc2VfcGxhbg==';
		const ECODE2                 = 'RW50ZXJwcmlzZSBHYXRld2F5IC0gV1AgT1RQIFZlcmlmaWNhdGlvbg==';
		const FROM_EMAIL             = 'no-reply@xecurify.com';
		const SUPPORT_EMAIL          = 'info@xecurify.com';
		const FEEDBACK_EMAIL         = 'otpsupport@xecurify.com';
		const HEADER_CONTENT_TYPE    = 'Content-Type: text/html';
		const SUCCESS                = 'SUCCESS';
		const ERROR                  = 'ERROR';
		const FAILURE                = 'FAILURE';
		const AREA_OF_INTEREST       = 'WP OTP Verification Plugin';
		const PLUGIN_TYPE            = MOV_TYPE;
		const PATTERN_PHONE          = '/^[\+]\d{1,4}\d{7,12}$|^[\+]\d{1,4}[\s]\d{7,12}$/';
		const PATTERN_COUNTRY_CODE   = '/^[\+]\d{1,4}.*/';
		const PATTERN_SPACES_HYPEN   = '/([\(\) \-]+)/';
		const POPUP_INPUT_PATTERN    = '/[^a-zA-Z0-9]/g';
		const ERROR_JSON_TYPE        = 'error';
		const SUCCESS_JSON_TYPE      = 'success';
		const EMAIL_TRANS_REMAINING  = 10;
		const PHONE_TRANS_REMAINING  = 10;
		const USERPRO_VER_FIELD_META = 'verification_form';
		const BUSINESS_FREE_TRIAL    = 'https://www.miniorange.com/businessfreetrial';

		const FAQ_URL                      = 'https://faq.miniorange.com/kb/otp-verification/';
		const FAQ_BASE_URL                 = 'https://faq.miniorange.com/knowledgebase/';
		const VIEW_TRANSACTIONS            = '/moas/viewtransactions';
		const FAQ_PAY_URL                  = 'https://faq.miniorange.com/knowledgebase/how-to-make-payment-for-the-otp-verification-plugin';
		const CUSTOM_MESSAGE_ADDON_SUCCESS = 'MO_ADDON_MESSAGE_CUSTOM_MESSAGE_SUCCESS';
		const CUSTOM_MESSAGE_ADDON_ERROR   = 'MO_ADDON_MESSAGE_CUSTOM_MESSAGE_ERROR';
		const MOCOUNTRY                    = 'India';
		const LICENCE_LIBRARY              = 'OTP\LicenseLibrary\Mo_License_Service';
		const LICENCE_SERVICE_FILE         = 'lib/license/src/class-mo-license-service.php';
		const MO_CROWN_SVG                 = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><g id="d4a43e0162b45f718f49244b403ea8f4"><g id="4ea4c3dca364b4cff4fba75ac98abb38"><g id="2413972edc07f152c2356073861cb269"><path id="2deabe5f8681ff270d3f37797985a977" d="M20.8007 20.5644H3.19925C2.94954 20.5644 2.73449 20.3887 2.68487 20.144L0.194867 7.94109C0.153118 7.73681 0.236091 7.52728 0.406503 7.40702C0.576651 7.28649 0.801941 7.27862 0.980492 7.38627L7.69847 11.4354L11.5297 3.72677C11.6177 3.54979 11.7978 3.43688 11.9955 3.43531C12.1817 3.43452 12.3749 3.54323 12.466 3.71889L16.4244 11.3598L23.0197 7.38654C23.1985 7.27888 23.4233 7.28702 23.5937 7.40728C23.7641 7.52754 23.8471 7.73707 23.8056 7.94136L21.3156 20.1443C21.2652 20.3887 21.0501 20.5644 20.8007 20.5644Z" fill="#ffcc00"></path></g></g></g></svg>';
		const MO_TWILIO_SETUP_GUIDE        = 'https://plugins.miniorange.com/twilio-gateway-setup-for-otp-verification/';
		const MO_GATEWAY_SETUP_GUIDE       = 'https://faq.miniorange.com/knowledgebase/use-own-gateway-plugin/';
		const MO_SUPPORTED_GATEWAYS_URL    = 'https://plugins.miniorange.com/supported-sms-email-gateways';
		const WCFMNOTIFICATION_SETUP_GUIDE = 'https://plugins.miniorange.com/wcfm-notification-vendor-notification-otp-verification-plugin';
		const DOKANNOTIFICATION_SETUPGUIDE = 'https://plugins.miniorange.com/dokan-notification-vendor-notification-otp-verification-plugin';
	}
}
