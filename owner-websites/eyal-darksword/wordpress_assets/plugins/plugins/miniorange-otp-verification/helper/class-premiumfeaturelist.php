<?php
/**
 * Load administrator changes for PremiumFeatureList
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Objects\BaseAddOnHandler;
use OTP\Objects\FormHandler;
use OTP\Objects\IFormHandler;
use OTP\Traits\Instance;
use OTP\Helper\MoFormDocs;

/**
 * This is the constant class which lists all the texts
 * that need to be supported for the Premium addon List.
 */
if ( ! class_exists( 'PremiumFeatureList' ) ) {
	/**
	 * PremiumFeatureList class
	 */
	final class PremiumFeatureList {

		use Instance;

		/** Variable declaration
		 *
		 * @var $premium_addon
		 */
		private $premium_addon;

		/** Variable declaration
		 *
		 * @var $premium_forms
		 */
		private $premium_forms;

		/** Variable declaration
		 *
		 * @var $both_email_phone_addon_forms
		 */
		private $both_email_phone_addon_forms;

		/** Variable declaration
		 *
		 * @var $addon_name
		 */
		private $addon_name;

		/**
		 * Constructor
		 */
		private function __construct() {
			$this->premium_addon = array(
				'both_email_and_phone'       => array(
					'name'              => __( 'Both Email and Phone Verification Addon', 'miniorange-otp-verification' ),
					'description'       => array(
						__( 'Verify both email and phone number during form submission', 'miniorange-otp-verification' ),
						__( 'Ensures more accurate data through verified user details', 'miniorange-otp-verification' ),
						__( 'Protect your site from fake or fraudulent Sign-ups', 'miniorange-otp-verification' ),
						__( 'Supported on Limited forms', 'miniorange-otp-verification' ),
					),
					'svg'               => '<svg width="50" height="50" viewBox="0 0 100 100" fill="none">
												<g clip-path="url(#clip0_14_116)">
													<path d="M90 0H10C4.47715 0 0 4.47715 0 10V90C0 95.5229 4.47715 100 10 100H90C95.5229 100 100 95.5229 100 90V10C100 4.47715 95.5229 0 90 0Z" fill="url(#paint0_linear_14_116)"/>
													<path fill-rule="evenodd" clip-rule="evenodd" d="M50.5 24.5C46.634 24.5 43.5 27.1863 43.5 30.5V45.5C43.5 48.8137 46.634 51.5 50.5 51.5H71.5C75.366 51.5 78.5 48.8137 78.5 45.5V30.5C78.5 27.1863 75.366 24.5 71.5 24.5H50.5ZM51.228 31.0639C50.6249 30.7192 49.81 30.8589 49.4079 31.3759C49.0059 31.8929 49.1688 32.5913 49.772 32.936L56.3891 36.7172C59.1812 38.3127 62.8188 38.3127 65.611 36.7172L72.2281 32.936C72.8312 32.5913 72.9942 31.8929 72.5921 31.3759C72.19 30.8589 71.3751 30.7192 70.772 31.0639L64.1549 34.8451C62.2444 35.9368 59.7556 35.9368 57.8452 34.8451L51.228 31.0639Z" fill="white"/>
													<path d="M58.625 70V66.7081C58.625 65.0725 57.567 63.6017 55.9534 62.9942L51.6309 61.3669C49.5786 60.5943 47.2397 61.4312 46.2511 63.292L45.875 64C45.875 64 40.5625 63 36.3125 59C32.0625 55 31 50 31 50L31.7523 49.646C33.7293 48.7156 34.6186 46.5143 33.7977 44.5827L32.0686 40.5144C31.4232 38.9958 29.8605 38 28.1226 38H24.625C22.2778 38 20.375 39.7909 20.375 42C20.375 59.6731 35.5973 74 54.375 74C56.7222 74 58.625 72.2091 58.625 70Z" fill="white"/>
												</g>
												<defs>
													<linearGradient id="paint0_linear_14_116" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
													<stop stop-color="#EB57E5"/>
													<stop offset="1" stop-color="#3FFFFF"/>
													</linearGradient>
													<clipPath id="clip0_14_116">
													<rect width="100" height="100" fill="white"/>
													</clipPath>
												</defs>
											</svg>',
					'price'             => '$89',
					'guide_link'        => '',
					'guide_request_msg' => __( 'Hi I am interested in the Both Email and Phone Verification addon, could you please tell me more about this addon?', 'miniorange-otp-verification' ),
					'support_msg'       => __( 'Hi! Could you please share the payment details for the Both Email and Phone Verification addon?', 'miniorange-otp-verification' ),
				),
				'reg_only_phone_addon'       => array(
					'name'         => __( 'Register Using Only Phone Number', 'miniorange-otp-verification' ),
					'description'  => array(
						__( 'Register with phone number and OTP', 'miniorange-otp-verification' ),
						__( 'No email required', 'miniorange-otp-verification' ),
						__( 'Supported Registration forms: WooCommerce, Ultimate Member, Wordpress etc.', 'miniorange-otp-verification' ),
					),
					'svg'          => '<svg width="50" height="50" viewBox="0 0 100 100" fill="none">
										<g id="5702c03fcabb879bfe0641db68c0bd60">
										<g id="fc53fd539e2f2cc4097cb8e3ecf1606d">
											<path id="0b5274ab205e435baa8eb19539234e50" d="M90 0H10C4.47715 0 0 4.47715 0 10V90C0 95.5229 4.47715 100 10 100H90C95.5229 100 100 95.5229 100 90V10C100 4.47715 95.5229 0 90 0Z" fill="url(#b166b3f6e9757cea71b85b13ea51b3dd)"></path>
										</g>
										<g id="a68f7d5e1a6388ee04e4eaab3bdff766">
											<g id="7f362f4b2891cb2c9c684ac05e53bb73">
											<path id="b6f186ef9482fd3626edade6146f28c7" fill-rule="evenodd" clip-rule="evenodd" d="M70.25 62.0466V65.75C70.25 68.2353 68.2353 70.25 65.75 70.25C45.8678 70.25 29.75 54.1322 29.75 34.25C29.75 31.7647 31.7647 29.75 34.25 29.75H37.9534C39.7934 29.75 41.4481 30.8703 42.1315 32.5787L43.9622 37.1556C44.8314 39.3286 43.8899 41.8051 41.7965 42.8517L41 43.25C41 43.25 42.125 48.875 46.625 53.375C51.125 57.875 56.75 59 56.75 59L57.1483 58.2035C58.1949 56.1101 60.6714 55.1686 62.8444 56.0378L67.4213 57.8685C69.1297 58.5519 70.25 60.2066 70.25 62.0466ZM66.875 34.25C66.875 36.7353 64.8603 38.75 62.375 38.75C59.8897 38.75 57.875 36.7353 57.875 34.25C57.875 31.7647 59.8897 29.75 62.375 29.75C64.8603 29.75 66.875 31.7647 66.875 34.25ZM66.2 41C68.4368 41 70.25 42.8132 70.25 45.05C70.25 46.5412 69.0412 47.75 67.55 47.75H57.2C55.7088 47.75 54.5 46.5412 54.5 45.05C54.5 42.8132 56.3132 41 58.55 41H66.2Z" fill="white"></path>
											</g>
										</g>
										</g>
										<defs>
										<linearGradient id="b166b3f6e9757cea71b85b13ea51b3dd" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
											<stop stop-color="#EB57E5"></stop>
											<stop offset="1" stop-color="#3FFFFF"></stop>
										</linearGradient>
										</defs>
									</svg>',
					'price'        => '$49',
					'guide_link'   => MoFormDocs::REGISTER_WITH_PHONE_ADDON_LINK['guideLink'],
					'support_msg'  => __( 'Hi I am interested in the Register Using Only Phone Number addon, could you please tell me more about this addon?', 'miniorange-otp-verification' ),
					'upgrade_slug' => 'wp_otp_register_with_phone_addon_plan',
				),
				'login_with_phone_addon'     => array(
					'name'              => __( 'Login Using Only Phone Number', 'miniorange-otp-verification' ),
					'description'       => array(
						__( 'Login using Phone Number', 'miniorange-otp-verification' ),
						__( 'Passwordless login', 'miniorange-otp-verification' ),
						__( 'Email address is not required', 'miniorange-otp-verification' ),
						__( 'Customizable as per Login Form', 'miniorange-otp-verification' ),
					),
					'svg'               => '<svg width="50" height="50" viewBox="0 0 100 100" fill="none">
										<g id="bdc921d4bff338c999c25cb7f7676a4d">
										<g id="a674357caf83f9024dba8f0d2829d650">
											<path id="aecaee670e9cd3942e0cab0f00858627" d="M90 0H10C4.47715 0 0 4.47715 0 10V90C0 95.5229 4.47715 100 10 100H90C95.5229 100 100 95.5229 100 90V10C100 4.47715 95.5229 0 90 0Z" fill="url(#53015cb3ee762013c785e00d8d673d9b)"></path>
											<g id="5d38c302f1f779775e8cb283f9d116ad">
											<g id="4d60257e005adf16df3159d4e47fbc83">
												<path id="3d1e870026f4185563bc93ab3e256a74" d="M70.25 65.75V62.0466C70.25 60.2066 69.1297 58.5519 67.4213 57.8685L62.8444 56.0378C60.6714 55.1686 58.1949 56.1101 57.1483 58.2035L56.75 59C56.75 59 51.125 57.875 46.625 53.375C42.125 48.875 41 43.25 41 43.25L41.7965 42.8517C43.8899 41.8051 44.8314 39.3286 43.9622 37.1556L42.1315 32.5787C41.4481 30.8703 39.7934 29.75 37.9534 29.75H34.25C31.7647 29.75 29.75 31.7647 29.75 34.25C29.75 54.1322 45.8678 70.25 65.75 70.25C68.2353 70.25 70.25 68.2353 70.25 65.75Z" fill="#28303F"></path>
											</g>
											</g>
										</g>
										</g>
										<defs>
										<linearGradient id="53015cb3ee762013c785e00d8d673d9b" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
											<stop stop-color="#8CFFAC"></stop>
											<stop offset="1" stop-color="#3FFFFF"></stop>
										</linearGradient>
										</defs>
									</svg>',
					'price'             => '$49',
					'guide_link'        => '',
					'guide_request_msg' => __( 'Hi I am interested in the Login Using Only Phone Number addon, could you please tell me more about this addon?', 'miniorange-otp-verification' ),
					'support_msg'       => __( 'Hi! Could you please share the payment details for the Login Using Only Phone Number addon?', 'miniorange-otp-verification' ),
				),
				'selected_country_addon'     => array(
					'name'         => 'Country Restriction Addon',
					'description'  => array(
						__( 'Enable OTP Verification for selected countries', 'miniorange-otp-verification' ),
						__( 'Restrict OTP Verification for selected countries', 'miniorange-otp-verification' ),
						__( 'Country code dropdown will be altered accordingly', 'miniorange-otp-verification' ),
					),
					'svg'          => '<svg width="50" height="50" viewBox="0 0 100 100" fill="none">
										<g id="c804ab86e06907df4ede7c5996a51eee">
										<rect width="100" height="100" rx="10" fill="url(#c631fb2424936253666f90eb3c760e43)"></rect>
										<g id="215da64cca5e778eae54f3e9be6f6171">
											<g id="255431f8fe3786cf28667958c83417de">
											<path id="103e2c5498800c8069ab033c4ae3fd13" opacity="0.4" d="M61.25 50C61.25 52.4853 59.2353 54.5 56.75 54.5H38.75V61.25C38.75 63.7353 40.7647 65.75 43.25 65.75H65.75C68.2353 65.75 70.25 63.7353 70.25 61.25V43.25C70.25 40.7647 68.2353 38.75 65.75 38.75H61.25V50Z" fill="white"></path>
											<path id="e12d10051d83e3666c506d0426968ce2" d="M31.4375 56.75H56.9912C59.3434 56.75 61.2502 54.7353 61.2502 52.25V34.25C61.2502 31.7647 59.3434 29.75 56.9912 29.75H31.4375V56.75Z" fill="white"></path>
											<path id="96d243b1d831672d9fb31e0117b0435b" opacity="0.4" fill-rule="evenodd" clip-rule="evenodd" d="M29.75 25.8125C30.682 25.8125 31.4375 26.568 31.4375 27.5V72.5C31.4375 73.432 30.682 74.1875 29.75 74.1875C28.818 74.1875 28.0625 73.432 28.0625 72.5V27.5C28.0625 26.568 28.818 25.8125 29.75 25.8125Z" fill="white"></path>
											</g>
										</g>
										</g>
										<defs>
										<linearGradient id="c631fb2424936253666f90eb3c760e43" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
											<stop stop-color="#EDEF83"></stop>
											<stop offset="1" stop-color="#00D6AF"></stop>
										</linearGradient>
										</defs>
									</svg>',
					'price'        => '$39',
					'guide_link'   => MoFormDocs::SELECTED_COUNTRY_CODE_ADDON_LINK['guideLink'],
					'support_msg'  => __( 'Hi I am interested in the Country Restriction Addon, could you please tell me more about this addon?', 'miniorange-otp-verification' ),
					'plan_name'    => __( 'Enterprise and WooCommerce Plan', 'miniorange-otp-verification' ),
					'upgrade_slug' => 'wp_otp_selected_country_addon_plan',
				),
				'wp_pass_reset_addon'        => array(
					'name'         => __( 'WordPress Password Reset Over OTP', 'miniorange-otp-verification' ),
					'description'  => array(
						__( 'Reset password using OTP instead of email links', 'miniorange-otp-verification' ),
						__( 'OTP Over Phone Supported', 'miniorange-otp-verification' ),
						__( 'OTP Over Email Supported', 'miniorange-otp-verification' ),
						__( 'User Friendly Password Reset', 'miniorange-otp-verification' ),
					),
					'svg'          => '<svg width="50" height="50" viewBox="0 0 100 100" fill="none" >
										<g id="563f69671e04ffeef3b83ea51e866208">
										<rect width="100" height="100" rx="10" fill="url(#7df1013e6d8f719f861e1022a164bc7d)"></rect>
										<g id="34454dd908cc56c9684f81974317ce7c">
											<g id="38645efbc9a6fbc2f72deb9c7ceb7067">
											<path id="0db6786045b6f3ac2f30450d4a1abca3" fill-rule="evenodd" clip-rule="evenodd" d="M50 75C63.8071 75 75 63.8071 75 50C75 36.1929 63.8071 25 50 25C36.1929 25 25 36.1929 25 50C25 63.8071 36.1929 75 50 75ZM56.2069 34.308C55.8248 33.3455 54.7348 32.8751 53.7724 33.2572C52.8099 33.6394 52.3395 34.7294 52.7216 35.6918L53.156 36.7858C52.139 36.5712 51.0827 36.4582 50 36.4582C42.1848 36.4582 35.625 42.4013 35.625 49.9999C35.625 51.2128 35.7947 52.3909 36.1136 53.5126C36.3968 54.5087 37.4338 55.0866 38.4299 54.8034C39.4259 54.5203 40.0038 53.4832 39.7207 52.4872C39.4953 51.6944 39.375 50.8613 39.375 49.9999C39.375 44.7118 44.008 40.2082 50 40.2082C52.035 40.2082 53.9261 40.7342 55.5312 41.6388C56.2234 42.0288 57.0864 41.9402 57.6849 41.4176C58.2834 40.895 58.4875 40.0519 58.1943 39.3133L56.2069 34.308ZM63.8864 46.4872C63.6032 45.4911 62.5662 44.9132 61.5701 45.1964C60.5741 45.4795 59.9962 46.5165 60.2793 47.5126C60.5047 48.3054 60.625 49.1385 60.625 49.9999C60.625 55.2879 55.992 59.7916 50 59.7916C47.965 59.7916 46.0739 59.2655 44.4688 58.361C43.7766 57.9709 42.9136 58.0595 42.315 58.5821C41.7165 59.1048 41.5124 59.9479 41.8056 60.6864L43.7931 65.6918C44.1752 66.6543 45.2652 67.1247 46.2276 66.7425C47.1901 66.3604 47.6605 65.2704 47.2784 64.308L46.844 63.2139C47.861 63.4286 48.9173 63.5416 50 63.5416C57.8152 63.5416 64.375 57.5985 64.375 49.9999C64.375 48.787 64.2053 47.6089 63.8864 46.4872Z" fill="white"></path>
											</g>
										</g>
										</g>
										<defs>
										<linearGradient id="7df1013e6d8f719f861e1022a164bc7d" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
											<stop stop-color="#FF7AB2"></stop>
											<stop offset="1" stop-color="#EA6CFF"></stop>
										</linearGradient>
										</defs>
									</svg>',
					'price'        => '$19',
					'guide_link'   => MoFormDocs::WORDPRESS_PASSWORD_RESET_ADDON_LINK['guideLink'],
					'support_msg'  => __( 'Hi! I am interested in the WordPress Password Reset Over OTP addon, could you please tell me more about this addon?', 'miniorange-otp-verification' ),
					'upgrade_slug' => 'wp_otp_wordpress_password_reset_addon_plan',
				),
				'country_addon'              => array(
					'name'              => __( 'Country Code Dropdown ', 'miniorange-otp-verification' ),
					'description'       => array(
						__( 'Enable country code dropdown on any phone field', 'miniorange-otp-verification' ),
						__( 'Country Code with Flags', 'miniorange-otp-verification' ),
						__( 'All countries supported', 'miniorange-otp-verification' ),
					),
					'svg'               => '<svg width="50" height="50" viewBox="0 0 100 100" fill="none">
										<g id="08cefd4fa19f0717074e4fc57bc48504">
										<rect width="100" height="100" rx="10" fill="url(#5988db2d005a8118b81906807593b68e)"></rect>
										<g id="e48dc9d97d17b4c9f6ac59928bd02728">
											<g id="e38251e1d5149b124578b5ec60d2a68d">
											<path id="3f4ac12419c6ede386891125add0d316" d="M31.25 46.25C27.7982 46.25 25 43.4518 25 40C25 36.5482 27.7982 33.75 31.25 33.75C34.7018 33.75 37.5 36.5482 37.5 40C37.5 43.4518 34.7018 46.25 31.25 46.25Z" fill="white"></path>
											<path id="908fde78edfb00996e6f69192a98c613" opacity="0.4" d="M31.25 66.25C27.7982 66.25 25 63.4518 25 60C25 56.5482 27.7982 53.75 31.25 53.75C34.7018 53.75 37.5 56.5482 37.5 60C37.5 63.4518 34.7018 66.25 31.25 66.25Z" fill="white"></path>
											<path id="63d7481f43c66fdf2e48dad539cd5285" opacity="0.4" fill-rule="evenodd" clip-rule="evenodd" d="M43.125 35.625C43.125 34.5895 43.9645 33.75 45 33.75H60C61.0355 33.75 61.875 34.5895 61.875 35.625C61.875 36.6605 61.0355 37.5 60 37.5H45C43.9645 37.5 43.125 36.6605 43.125 35.625Z" fill="white"></path>
											<path id="ac4b2e3e5992a6f9f735439c59649df5" fill-rule="evenodd" clip-rule="evenodd" d="M43.125 55.625C43.125 54.5895 43.9645 53.75 45 53.75H60C61.0355 53.75 61.875 54.5895 61.875 55.625C61.875 56.6605 61.0355 57.5 60 57.5H45C43.9645 57.5 43.125 56.6605 43.125 55.625Z" fill="white"></path>
											<path id="4adc2ca37258b425706c69f37bfba3e9" opacity="0.4" fill-rule="evenodd" clip-rule="evenodd" d="M43.125 44.375C43.125 43.3395 43.9645 42.5 45 42.5L75 42.5C76.0355 42.5 76.875 43.3395 76.875 44.375C76.875 45.4105 76.0355 46.25 75 46.25L45 46.25C43.9645 46.25 43.125 45.4105 43.125 44.375Z" fill="white"></path>
											<path id="0e13eb575cdb0d9e5ebb72e3d301b6b0" fill-rule="evenodd" clip-rule="evenodd" d="M43.125 64.375C43.125 63.3395 43.9645 62.5 45 62.5H75C76.0355 62.5 76.875 63.3395 76.875 64.375C76.875 65.4105 76.0355 66.25 75 66.25H45C43.9645 66.25 43.125 65.4105 43.125 64.375Z" fill="white"></path>
											</g>
										</g>
										</g>
										<defs>
										<linearGradient id="5988db2d005a8118b81906807593b68e" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
											<stop stop-color="#5D94FF"></stop>
											<stop offset="1" stop-color="#1CE7E7"></stop>
										</linearGradient>
										</defs>
									</svg>',
					'price'             => '$19',
					'guide_link'        => '',
					'guide_request_msg' => __( 'Hi I am interested in the Country Code Dropdown addon, could you please tell me more about this addon?', 'miniorange-otp-verification' ),
					'support_msg'       => __( 'Hi! Could you please share the payment details for the Country Code Dropdown addon?', 'miniorange-otp-verification' ),
				),
				'wp_sms_notification_addon'  => array(
					'name'        => __( 'WordPress SMS Notification to Admin & User on Registration', 'miniorange-otp-verification' ),
					'description' => array(
						__( 'Send SMS Notification on User Registration', 'miniorange-otp-verification' ),
						__( 'Customizable SMS Template', 'miniorange-otp-verification' ),
						__( 'Notification to Multiple Admins & Users.', 'miniorange-otp-verification' ),
					),
					'svg'         => '<svg width="50" height="50" viewBox="0 0 100 100" fill="none" >
										<g id="7964060c44d36a8760d399f2c150d191">
										<rect width="100" height="100" rx="10" fill="url(#3af86c1638de5d9ea6254087fc809a51)"></rect>
										<g id="92dda51326a520489a53d8be9018dd82">
											<g id="f87bc7354c18ce973747fc33f012f5cf">
											<path id="667687f78268e2dd1ba66e3b8af6f5c7" fill-rule="evenodd" clip-rule="evenodd" d="M37.0013 63.5005H62.9987C67.1125 63.5005 69.4608 59.3625 66.9925 56.4628C65.8998 55.1791 65.2263 53.6565 65.0451 52.0599L64.676 48.8074C64.2901 48.8521 63.8977 48.875 63.4999 48.875C57.908 48.875 53.3749 44.3419 53.3749 38.75C53.3749 36.5655 54.0666 34.5427 55.2431 32.8885C55.198 32.8725 55.1527 32.8568 55.1074 32.8413V32.6079C55.1074 29.7872 52.8207 27.5005 50 27.5005C47.1793 27.5005 44.8926 29.7872 44.8926 32.6079V32.8413C40.0722 34.4917 36.5036 38.4145 35.961 43.1947L34.9549 52.0599C34.7737 53.6565 34.1002 55.1791 33.0075 56.4628C30.5392 59.3625 32.8875 63.5005 37.0013 63.5005ZM70.25 38.75C70.25 42.4779 67.2279 45.5 63.5 45.5C59.7721 45.5 56.75 42.4779 56.75 38.75C56.75 35.0221 59.7721 32 63.5 32C67.2279 32 70.25 35.0221 70.25 38.75ZM50 72.5005C53.0522 72.5005 55.6581 70.6988 56.6872 68.1615C56.7301 68.0557 56.75 67.9421 56.75 67.8279C56.75 67.3016 56.3234 66.875 55.7971 66.875H44.2029C43.6766 66.875 43.25 67.3016 43.25 67.8279C43.25 67.9421 43.2699 68.0557 43.3128 68.1615C44.3419 70.6988 46.9478 72.5005 50 72.5005Z" fill="white"></path>
											</g>
										</g>
										</g>
										<defs>
										<linearGradient id="3af86c1638de5d9ea6254087fc809a51" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
											<stop stop-color="#4790FF"></stop>
											<stop offset="1" stop-color="#896CFF"></stop>
										</linearGradient>
										</defs>
									</svg>',
					'price'       => '$19',
					'guide_link'  => 'https://plugins.miniorange.com/how-to-configure-wordpress-sms-notification-addon',
					'support_msg' => __( 'Hi I am interested in the WordPress SMS Notification to Admin  User on Registration addon, could you please tell me more about this addon?', 'miniorange-otp-verification' ),
				),
				'wc_pass_reset_addon'        => array(
					'name'         => 'WooCommerce Password Reset Over OTP ',
					'description'  => array(
						__( 'Reset password using OTP', 'miniorange-otp-verification' ),
						__( 'OTP Over Phone', 'miniorange-otp-verification' ),
						__( 'OTP Over Email', 'miniorange-otp-verification' ),
						__( 'User Friendly Password Reset', 'miniorange-otp-verification' ),
					),
					'svg'          => '<svg width="50" height="50" viewBox="0 0 100 100" fill="none" >
											<g id="563f69671e04ffeef3b83ea51e866208">
											<rect width="100" height="100" rx="10" fill="url(#7df1013e6d8f719f861e1022a164bc7d)"></rect>
											<g id="34454dd908cc56c9684f81974317ce7c">
												<g id="38645efbc9a6fbc2f72deb9c7ceb7067">
												<path id="0db6786045b6f3ac2f30450d4a1abca3" fill-rule="evenodd" clip-rule="evenodd" d="M50 75C63.8071 75 75 63.8071 75 50C75 36.1929 63.8071 25 50 25C36.1929 25 25 36.1929 25 50C25 63.8071 36.1929 75 50 75ZM56.2069 34.308C55.8248 33.3455 54.7348 32.8751 53.7724 33.2572C52.8099 33.6394 52.3395 34.7294 52.7216 35.6918L53.156 36.7858C52.139 36.5712 51.0827 36.4582 50 36.4582C42.1848 36.4582 35.625 42.4013 35.625 49.9999C35.625 51.2128 35.7947 52.3909 36.1136 53.5126C36.3968 54.5087 37.4338 55.0866 38.4299 54.8034C39.4259 54.5203 40.0038 53.4832 39.7207 52.4872C39.4953 51.6944 39.375 50.8613 39.375 49.9999C39.375 44.7118 44.008 40.2082 50 40.2082C52.035 40.2082 53.9261 40.7342 55.5312 41.6388C56.2234 42.0288 57.0864 41.9402 57.6849 41.4176C58.2834 40.895 58.4875 40.0519 58.1943 39.3133L56.2069 34.308ZM63.8864 46.4872C63.6032 45.4911 62.5662 44.9132 61.5701 45.1964C60.5741 45.4795 59.9962 46.5165 60.2793 47.5126C60.5047 48.3054 60.625 49.1385 60.625 49.9999C60.625 55.2879 55.992 59.7916 50 59.7916C47.965 59.7916 46.0739 59.2655 44.4688 58.361C43.7766 57.9709 42.9136 58.0595 42.315 58.5821C41.7165 59.1048 41.5124 59.9479 41.8056 60.6864L43.7931 65.6918C44.1752 66.6543 45.2652 67.1247 46.2276 66.7425C47.1901 66.3604 47.6605 65.2704 47.2784 64.308L46.844 63.2139C47.861 63.4286 48.9173 63.5416 50 63.5416C57.8152 63.5416 64.375 57.5985 64.375 49.9999C64.375 48.787 64.2053 47.6089 63.8864 46.4872Z" fill="white"></path>
												</g>
											</g>
											</g>
											<defs>
											<linearGradient id="7df1013e6d8f719f861e1022a164bc7d" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
												<stop stop-color="#FF7AB2"></stop>
												<stop offset="1" stop-color="#EA6CFF"></stop>
											</linearGradient>
											</defs>
										</svg>',
					'price'        => '$19',
					'guide_link'   => MoFormDocs::WOOCOMMERCE_PASSWORD_RESET_ADDON_LINK['guideLink'],
					'support_msg'  => __( 'Hi! I am interested in the WooCommerce Password Reset Over OTP addon, could you please tell me more about this addon?', 'miniorange-otp-verification' ),
					'plan_name'    => __( 'Enterprise and WooCommerce Plan', 'miniorange-otp-verification' ),
					'upgrade_slug' => 'wp_otp_wc_password_reset_addon_plan',
				),
				'otp_selected_product_addon' => array(
					'name'              => __( 'OTP on Selected Product Category', 'miniorange-otp-verification' ),
					'description'       => array(
						__( 'OTP verification will be enabled on the selected product category', 'miniorange-otp-verification' ),
						__( 'All WooCommerce categories supported', 'miniorange-otp-verification' ),
					),
					'svg'               => '<svg width="50" height="50" viewBox="0 0 100 100" fill="none" >
										<g id="678c9a11">
										<rect width="100" height="100" rx="10" fill="url(#1f829a77)"></rect>
										<g id="c8456309">
											<path id="9cbc5e53" fill-rule="evenodd" clip-rule="evenodd" d="M28.5879 28.9171C28.2121 28.7636 27.7444 28.7501 26.3794 28.75L25.0001 28.75H25L24.0001 28.7501C23.5859 28.7502 23.2501 28.4144 23.25 28.0002C23.2499 27.586 23.5857 27.2502 23.9999 27.2501L24.9999 27.25H25L26.3795 27.25L26.5362 27.25C27.6814 27.2495 28.471 27.2491 29.155 27.5285C29.7566 27.7742 30.2841 28.1721 30.6856 28.683C31.1421 29.264 31.3587 30.0233 31.6728 31.1246L31.7158 31.2753L32.28 33.2501H61.7156H61.7521C62.7894 33.2501 63.6182 33.2501 64.276 33.3086C64.9466 33.3682 65.5297 33.4942 66.0359 33.8053C66.8273 34.2918 67.4101 35.0547 67.6711 35.9463C67.8381 36.5165 67.8063 37.1122 67.6873 37.7748C67.5707 38.4248 67.3526 39.2244 67.0797 40.2251L67.07 40.2604L64.0098 51.4814L63.964 51.6494C63.5481 53.176 63.281 54.1567 62.7042 54.9035C62.1963 55.5611 61.5248 56.074 60.7567 56.391C59.8844 56.7509 58.8681 56.7506 57.2858 56.7502L57.1117 56.7501H42.8275L42.6556 56.7502H42.6556C41.0914 56.7506 40.0865 56.7509 39.2212 56.3975C38.4591 56.0862 37.791 55.5823 37.2824 54.9351C36.7049 54.2002 36.4291 53.2339 35.9998 51.7297L35.9526 51.5644L30.9931 34.2062L30.2735 31.6874C29.8985 30.375 29.757 29.929 29.5062 29.6098C29.2653 29.3033 28.9488 29.0645 28.5879 28.9171ZM37.25 66C37.25 63.3766 39.3766 61.25 42 61.25C44.6234 61.25 46.75 63.3766 46.75 66C46.75 68.6233 44.6234 70.75 42 70.75C39.3766 70.75 37.25 68.6233 37.25 66ZM58 61.25C55.3766 61.25 53.25 63.3766 53.25 66C53.25 68.6233 55.3766 70.75 58 70.75C60.6234 70.75 62.75 68.6233 62.75 66C62.75 63.3766 60.6234 61.25 58 61.25Z" fill="white"></path>
										</g>
										</g>
										<defs>
										<linearGradient id="1f829a77" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
											<stop stop-color="#5D94FF"></stop>
											<stop offset="1" stop-color="#1CE7E7"></stop>
										</linearGradient>
										</defs>
									</svg>',
					'price'             => '$49',
					'guide_link'        => '',
					'guide_request_msg' => __( 'Hi I am interested in the Selected Product Category addon, could you please share the payment details for this addon?', 'miniorange-otp-verification' ),
					'support_msg'       => __( 'Hi I am interested in the Selected Product Category addon, could you please share the payment details for this addon?', 'miniorange-otp-verification' ),
				),
				'ip_base_country_code_addon' => array(
					'name'              => __( 'Geolocation/IP Base Country Code Dropdown', 'miniorange-otp-verification' ),
					'description'       => array(
						__( 'Alter the country code dropdown based on the users IP address or geolocation data.', 'miniorange-otp-verification' ),
						__( 'Enhances user experience', 'miniorange-otp-verification' ),
						__( 'Simplify the country selection process', 'miniorange-otp-verification' ),
					),
					'svg'               => '<svg width="50" height="50" viewBox="0 0 100 100" fill="none">
										<g id="c804ab86e06907df4ede7c5996a51eee">
										<rect width="100" height="100" rx="10" fill="url(#c631fb2424936253666f90eb3c760e43)"></rect>
										<g id="215da64cca5e778eae54f3e9be6f6171">
											<g id="255431f8fe3786cf28667958c83417de">
											<path id="103e2c5498800c8069ab033c4ae3fd13" opacity="0.4" d="M61.25 50C61.25 52.4853 59.2353 54.5 56.75 54.5H38.75V61.25C38.75 63.7353 40.7647 65.75 43.25 65.75H65.75C68.2353 65.75 70.25 63.7353 70.25 61.25V43.25C70.25 40.7647 68.2353 38.75 65.75 38.75H61.25V50Z" fill="white"></path>
											<path id="e12d10051d83e3666c506d0426968ce2" d="M31.4375 56.75H56.9912C59.3434 56.75 61.2502 54.7353 61.2502 52.25V34.25C61.2502 31.7647 59.3434 29.75 56.9912 29.75H31.4375V56.75Z" fill="white"></path>
											<path id="96d243b1d831672d9fb31e0117b0435b" opacity="0.4" fill-rule="evenodd" clip-rule="evenodd" d="M29.75 25.8125C30.682 25.8125 31.4375 26.568 31.4375 27.5V72.5C31.4375 73.432 30.682 74.1875 29.75 74.1875C28.818 74.1875 28.0625 73.432 28.0625 72.5V27.5C28.0625 26.568 28.818 25.8125 29.75 25.8125Z" fill="white"></path>
											</g>
										</g>
										</g>
										<defs>
										<linearGradient id="c631fb2424936253666f90eb3c760e43" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
											<stop stop-color="#EDEF83"></stop>
											<stop offset="1" stop-color="#00D6AF"></stop>
										</linearGradient>
										</defs>
									</svg>',
					'price'             => '$39',
					'guide_link'        => MoFormDocs::GEOLOCATION_COUNTRY_CODE_ADDON_LINK['guideLink'],
					'guide_request_msg' => __( 'Hi I am interested in the Geolocation/IP Base Country Code Dropdown addon, could you please tell me more about this addon?', 'miniorange-otp-verification' ),
					'support_msg'       => __( 'Hi! Could you please share the payment details for the Geolocation/IP Base Country Code Dropdown addon?', 'miniorange-otp-verification' ),
					'plan_name'         => __( 'Enterprise and WooCommerce Plan', 'miniorange-otp-verification' ),
					'upgrade_slug'      => 'wp_otp_geolocation_countrycode_addon_plan',
				),
				'otp_over_call_addon'        => array(
					'name'        => 'OTP Over Call',
					'description' => array(
						__( 'Send OTP Over Call instead of SMS', 'miniorange-otp-verification' ),
						__( 'User friendly', 'miniorange-otp-verification' ),
						__( 'Hassle-Free Setup', 'miniorange-otp-verification' ),
						__( 'This add-on works with the Twilio Gateway', 'miniorange-otp-verification' ),
					),
					'svg'         => '<svg width="50" height="50" viewBox="0 0 100 100" fill="none">
										<g id="bc0e8f986a2ec8b31050a44d5b1b2afb">
										<rect width="100" height="100" rx="10" fill="url(#5151e7ec67142d62c055f74248b0a28e)"></rect>
										<g id="87883360d9a72962dedfce91344b024f">
											<g id="3e3ed55deb713f59daf09bd3365974b6">
											<path id="a21502646450931d25a993ee6ac0962b" d="M70.25 65.75V62.0466C70.25 60.2066 69.1297 58.5519 67.4213 57.8685L62.8444 56.0378C60.6714 55.1686 58.1949 56.1101 57.1483 58.2035L56.75 59C56.75 59 51.125 57.875 46.625 53.375C42.125 48.875 41 43.25 41 43.25L41.7965 42.8517C43.8899 41.8051 44.8314 39.3286 43.9622 37.1556L42.1315 32.5787C41.4481 30.8703 39.7934 29.75 37.9534 29.75H34.25C31.7647 29.75 29.75 31.7647 29.75 34.25C29.75 54.1322 45.8678 70.25 65.75 70.25C68.2353 70.25 70.25 68.2353 70.25 65.75Z" fill="#28303F"></path>
											</g>
										</g>
										</g>
										<defs>
										<linearGradient id="5151e7ec67142d62c055f74248b0a28e" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
											<stop stop-color="#8CFFAC"></stop>
											<stop offset="1" stop-color="#3FFFFF"></stop>
										</linearGradient>
										</defs>
									</svg>',
					'price'       => '$49',
					'guide_link'  => MoFormDocs::OTP_OVER_CALL_TWILIO_ADDON_LINK['guideLink'],
					'support_msg' => __( 'Hi! I am interested in the OTP Over Phone Call addon, could you please tell me more about this addon?', 'miniorange-otp-verification' ),
					'plan_name'   => __( 'Twilio Gateway, Enterprise and WooCommerce Plan', 'miniorange-otp-verification' ),
				),
				'api_otp_verification_addon' => array(
					'name'              => 'OTP Verification for Android/IOS Application',
					'description'       => array(
						__( 'Get APIs to connect WordPress site and mobile application', 'miniorange-otp-verification' ),
						__( 'API for Send OTP', 'miniorange-otp-verification' ),
						__( 'API for Verify OTP', 'miniorange-otp-verification' ),
					),
					'svg'               => '<svg width="50" height="50" viewBox="0 0 100 100" fill="none">
										<g id="7e95c2d921a95088816629c37b6984aa">
										<rect width="100" height="100" rx="10" fill="url(#6883cbcb1edf8e76de86908e841df169)"></rect>
										<g id="e7c3768e5f96e7ff7b6e3ecc4f149e28">
											<g id="edd8777e157c12a43d313e76c141f96c">
											<path id="86428f1dfb81a502ab48f6dd9ff2420e" fill-rule="evenodd" clip-rule="evenodd" d="M32 27.5C29.5147 27.5 27.5 29.5147 27.5 32V41C27.5 43.4853 29.5147 45.5 32 45.5H41C43.4853 45.5 45.5 43.4853 45.5 41V32C45.5 29.5147 43.4853 27.5 41 27.5H32ZM36.5 72.5C41.4706 72.5 45.5 68.4706 45.5 63.5C45.5 58.5294 41.4706 54.5 36.5 54.5C31.5294 54.5 27.5 58.5294 27.5 63.5C27.5 68.4706 31.5294 72.5 36.5 72.5ZM54.5 59C54.5 56.5147 56.5147 54.5 59 54.5H68C70.4853 54.5 72.5 56.5147 72.5 59V68C72.5 70.4853 70.4853 72.5 68 72.5H59C56.5147 72.5 54.5 70.4853 54.5 68V59ZM64.625 29.1875C64.625 28.2555 63.8695 27.5 62.9375 27.5C62.0055 27.5 61.25 28.2555 61.25 29.1875V35.375H55.0625C54.1305 35.375 53.375 36.1305 53.375 37.0625C53.375 37.9945 54.1305 38.75 55.0625 38.75H61.25V44.9375C61.25 45.8695 62.0055 46.625 62.9375 46.625C63.8695 46.625 64.625 45.8695 64.625 44.9375V38.75H70.8125C71.7445 38.75 72.5 37.9945 72.5 37.0625C72.5 36.1305 71.7445 35.375 70.8125 35.375H64.625V29.1875Z" fill="white"></path>
											</g>
										</g>
										</g>
										<defs>
										<linearGradient id="6883cbcb1edf8e76de86908e841df169" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
											<stop stop-color="#47DEFF"></stop>
											<stop offset="1" stop-color="#1653EF"></stop>
										</linearGradient>
										</defs>
									</svg>',
					'price'             => '$89',
					'guide_link'        => '',
					'guide_request_msg' => __( 'Hi! I am interested in the OTP Verification for Android/IOS Application addon, could you please tell me more about this addon?', 'miniorange-otp-verification' ),
					'support_msg'       => __( 'Hi! Could you please share the payment details for the  OTP Verification for Android/IOS Application addon?', 'miniorange-otp-verification' ),
				),
				'otp_spam_preventer'         => array(
					'name'         => __( 'OTP Spam Preventer', 'miniorange-otp-verification' ),
					'description'  => array(
						__( 'Set timer to resend OTP', 'miniorange-otp-verification' ),
						__( 'Block Sending OTP Until set timer out', 'miniorange-otp-verification' ),
						__( 'Limit OTPs based on IP', 'miniorange-otp-verification' ),
						__( 'Restrict user from multiple OTP attempts', 'miniorange-otp-verification' ),
					),
					'svg'          => '<svg width="50" height="50" viewBox="0 0 100 100" fill="none">
										<g id="otp-spam-preventer">
										<rect width="100" height="100" rx="10" fill="url(#spam-preventer-gradient)"></rect>
										<g id="shield-icon">
											<path d="M50 25L35 30V45C35 55 42.5 65 50 70C57.5 65 65 55 65 45V30L50 25Z" fill="white" opacity="0.9"></path>
											<path d="M50 35L42.5 37.5V45C42.5 50 47.5 55 50 57.5C52.5 55 57.5 50 57.5 45V37.5L50 35Z" fill="white"></path>
										</g>
										</g>
										<defs>
										<linearGradient id="spam-preventer-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
											<stop stop-color="#FF6B6B"></stop>
											<stop offset="1" stop-color="#C92A2A"></stop>
										</linearGradient>
										</defs>
									</svg>',
					'price'        => '$49',
					'guide_link'   => MoFormDocs::LIMIT_OTP_REQUEST_ADDON_LINK['guideLink'],
					'support_msg'  => __( 'Hi I am interested in the Limit OTP Request addon, could you please tell me more about this addon?', 'miniorange-otp-verification' ),
					'plan_name'    => __( 'Enterprise and WooCommerce Plan', 'miniorange-otp-verification' ),
					'upgrade_slug' => 'wp_otp_limit_otp_addon_plan',
				),
			);

			$this->premium_forms = array(
				'ELEMENTOR_PRO'                 => array(
					'name'      => 'Elementor Pro Forms',
					'plan_name' => 'Enterprise Plan',
				),
				'USERREG'                       => array(
					'name'      => 'User Registration Forms - WP Everest',
					'plan_name' => 'Twilio Gateway Plan',
				),
				'JETENGINEFORM'                 => array(
					'name'      => 'Jet Engine Form ',
					'plan_name' => 'Enterprise Plan',
				),
				'WCFM'                          => array(
					'name'      => 'WooCommerce Frontend Manager Form (WCFM)',
					'plan_name' => 'Enterprise Plan',
				),
				'HOUZEZ_REG'                    => array(
					'name'      => 'Houzez - Real Estate Theme',
					'plan_name' => 'Enterprise Plan',
				),
				'TUTOR_LMS_LOGIN'               => array(
					'name'      => 'Tutor LMS Login Form ',
					'plan_name' => 'Twilio Gateway Plan',
				),
				'TUTOR_LMS_INSTRUCTOR_REG_FORM' => array(
					'name'      => 'Tutor LMS Instructor Registration Form',
					'plan_name' => 'Twilio Gateway Plan',
				),
				'TUTOR_LMS_STUDENT_REG_FORM'    => array(
					'name'      => 'Tutor LMS Student Registration Form',
					'plan_name' => 'Twilio Gateway Plan',
				),
				'CHECKOUT_WC_FORM'              => array(
					'name'      => 'Checkout WC Form',
					'plan_name' => 'WooCommerce OTP and Notification Plan',
				),
				'JET_BUILDER_FORM'              => array(
					'name'      => 'JetFormBuilder Form by Crocoblock',
					'plan_name' => 'Enterprise Plan',
				),
				'MO_WS_FORMS'                   => array(
					'name'      => 'WS Forms - Contact Forms',
					'plan_name' => 'Enterprise Plan',
				),
				'FLUENT_CONV_FORM'              => array(
					'name'      => 'Fluent Conversational Forms',
					'plan_name' => 'Enterprise Plan',
				),
				'MO_LOGIN_REG_USING_PHONE_FORM' => array(
					'name'      => 'miniOrange - Login and register using phone only',
					'plan_name' => 'WooCommerce OTP and Notification Plan',
				),
				'DOKAN_REG_FORM'                => array(
					'name'      => 'Dokan Registration Form',
					'plan_name' => 'WooCommerce OTP and Notification Plan',
				),
			);

			$this->both_email_phone_addon_forms = array(
				'ELEMENTOR_PRO'    => array(
					'name' => 'Elementor Pro Forms',
				),
				'WC_CHECKOUT_FORM' => array(
					'name' => 'WooCommerce Checkout Form - Classic Form',
				),
				'WC_REG_FORM'      => array(
					'name' => 'WooCommerce Registration Form',
				),
				'GRAVITY_FORM'     => array(
					'name' => 'Gravity Form',
				),
			);
		}

		/**
		 * Function called to get the addon names
		 *
		 * @return array
		 */
		public function get_add_on_name() {
			return $this->addon_name;
		}

		/**
		 * Function called to get the premium addon list
		 *
		 * @return array
		 */
		public function get_premium_add_on_list() {
			return $this->premium_addon;
		}

		/**
		 * Function called to get the premium form list
		 *
		 * @return array
		 */
		public function get_premium_forms() {
			return $this->premium_forms;
		}

		/**
		 * Function called to get the form list supported in both email and phone addon
		 *
		 * @return array
		 */
		public function get_both_email_phone_addon_forms() {
			return $this->both_email_phone_addon_forms;
		}
	}
}
