<?php
/**
 * Load administrator changes for MoMessages
 *
 * @package miniorange-otp-verification/helper
 */

namespace OTP\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OTP\Objects\BaseMessages;
use OTP\Traits\Instance;

/**
 * This is the constant class which lists all the messages
 * to be shown in the plugin.
 */
if ( ! class_exists( 'MoMessages' ) ) {
	/**
	 * MoMessages class
	 */
	final class MoMessages extends BaseMessages {

		use Instance;

		/**
		 * This function is used to get the frontend messages for the plugin.
		 *
		 * @return array
		 */
		public static function mo_get_frontend_messages() {
			$frontend_messages = maybe_serialize(
				array(

					// General Messages.
					self::BLOCKED_COUNTRY               => __( 'This country is blocked by the admin. Please enter another phone number or contact site admin.', 'miniorange-otp-verification' ),
					self::GLOBALLY_INVALID_PHONE_FORMAT => __( '##phone## is not a Globally valid phone number. Please enter a valid Phone Number.', 'miniorange-otp-verification' ),
					self::OTP_SENT_PHONE                => __( 'A OTP (One Time Passcode) has been sent to ##phone##. Please enter the OTP in the field below to verify your phone.', 'miniorange-otp-verification' ),
					self::OTP_SENT_EMAIL                => __( 'A One Time Passcode has been sent to ##email##. Please enter the OTP below to verify your Email Address. If you cannot see the email in your inbox, make sure to check your SPAM folder.', 'miniorange-otp-verification' ),

					self::ERROR_OTP_EMAIL               => __( 'There was an error in sending the OTP. Please enter a valid email id or contact site Admin.', 'miniorange-otp-verification' ),
					self::ERROR_OTP_PHONE               => __( 'There was an error in sending the OTP to the given Phone. Number. Please Try Again or contact site Admin.', 'miniorange-otp-verification' ),
					self::ERROR_PHONE_FORMAT            => __( '##phone## is not a valid phone number. Please enter a valid Phone Number. E.g:+1XXXXXXXXXX', 'miniorange-otp-verification' ),
					self::ERROR_EMAIL_FORMAT            => __( '##email## is not a valid email address. Please enter a valid Email Address. E.g:abc@abc.abc', 'miniorange-otp-verification' ),

					self::INVALID_EMAIL                 => sprintf(
						/* translators: %1$s: opening bold tag, %2$s: opening italic tag, %3$s: opening anchor tag, %4$s: closing anchor tag, %5$s: closing italic tag, %6$s: closing bold tag */
						__( 'Invalid Email address. Please register using a valid Email Address or contact us at %1$s%2$s%3$s <u>%4$s</u>%5$s%6$s to know more.', 'miniorange-otp-verification' ),
						'<b>',
						'<i>',
						'<a style="cursor:pointer;" onClick="otpSupportOnClick();">',
						'</a>',
						'</i>',
						'</b>'
					),

					self::CHOOSE_METHOD                 => __( 'Please select one of the methods below to verify your account. A One time passcode will be sent to the selected method.', 'miniorange-otp-verification' ),

					self::PLEASE_VALIDATE               => __( 'You need to verify yourself in order to submit this form', 'miniorange-otp-verification' ),

					self::ERROR_PHONE_BLOCKED           => __( '##phone## has been blocked by the admin. Please Try a different number or Contact site Admin.', 'miniorange-otp-verification' ),
					self::ERROR_EMAIL_BLOCKED           => __( '##email## has been blocked by the admin. Please Try a different email or Contact site Admin.', 'miniorange-otp-verification' ),
					self::EMAIL_MISMATCH                => __( 'The email OTP was sent to and the email in contact submission do not match.', 'miniorange-otp-verification' ),
					self::PHONE_MISMATCH                => __( 'The phone number OTP was sent to and the phone number in contact submission do not match.', 'miniorange-otp-verification' ),

					self::ENTER_PHONE                   => __( 'You will have to provide a Phone Number before you can verify it.', 'miniorange-otp-verification' ),

					self::ENTER_EMAIL                   => __( 'You will have to provide an Email Address before you can verify it.', 'miniorange-otp-verification' ),

					self::USERNAME_MISMATCH             => __( 'Username that the OTP was sent to and the username submitted do not match', 'miniorange-otp-verification' ),

					self::ENTER_PHONE_CODE              => __( 'Please enter the verification code sent to your phone', 'miniorange-otp-verification' ),

					self::ENTER_EMAIL_CODE              => __( 'Please enter the verification code sent to your email address', 'miniorange-otp-verification' ),

					self::ENTER_VERIFY_CODE             => __( 'Please verify yourself before submitting the form.', 'miniorange-otp-verification' ),

					self::ENTER_PHONE_VERIFY_CODE       => __( 'Please verify your phone number before submitting the form.', 'miniorange-otp-verification' ),

					self::ENTER_EMAIL_VERIFY_CODE       => __( 'Please verify your email address before submitting the form.', 'miniorange-otp-verification' ),

					self::PHONE_VALIDATION_MSG          => __( 'Enter your mobile number below for verification :', 'miniorange-otp-verification' ),

					self::ENTER_PHONE_DEFAULT           => __( 'ERROR: Please enter a valid phone number.', 'miniorange-otp-verification' ),

					self::OTP_SENT                      => __( 'A passcode has been sent to {{method}}. Please enter the otp below to verify your account.', 'miniorange-otp-verification' ),

					self::ERR_OTP                       => __( 'There was an error in sending OTP. Please click on Resend OTP link to resend the OTP.', 'miniorange-otp-verification' ),

					self::INVALID_OTP                   => __( 'Invalid one time passcode. Please enter a valid passcode.', 'miniorange-otp-verification' ),

					self::REQUIRED_OTP                  => __( 'Please enter a value in OTP field.', 'miniorange-otp-verification' ),

					self::UNKNOWN_ERROR                 => __( 'Error processing your request. Please try again.', 'miniorange-otp-verification' ),
					self::INVALID_OP                    => __( 'Invalid Operation. Please Try Again', 'miniorange-otp-verification' ),

					self::MO_REG_ENTER_PHONE            => __( 'Phone with country code eg. +1xxxxxxxxxx', 'miniorange-otp-verification' ),

					self::PHONE_NOT_FOUND               => __( 'Sorry, but you don\'t have a registered phone number.', 'miniorange-otp-verification' ),

					self::REGISTER_PHONE_LOGIN          => __( 'A new security system has been enabled for you. Please register your phone to continue.', 'miniorange-otp-verification' ),
					self::PHONE_EXISTS                  => __( 'Phone Number is already in use. Please use another number.', 'miniorange-otp-verification' ),

					self::EMAIL_EXISTS                  => __( 'Email is already in use. Please use another email.', 'miniorange-otp-verification' ),

					self::INVALID_USERNAME              => __( 'Please enter a valid username or email.', 'miniorange-otp-verification' ),

					self::INVALID_PHONE                 => __( 'Please enter a valid phone number', 'miniorange-otp-verification' ),

					self::ERROR_SENDING_SMS             => __( 'There was an error sending SMS to the user', 'miniorange-otp-verification' ),

					self::SMS_SENT_SUCCESS              => __( 'SMS was sent successfully.', 'miniorange-otp-verification' ),

					self::ENTER_VERIFICATION_CODE       => __( 'Please enter a verification code to verify yourself', 'miniorange-otp-verification' ),

					self::USER_IS_BLOCKED               => sprintf(
					/* translators: %1$s: opening span tag, %2$s: closing span tag */
						__(
							'You have exceeded the limit to send OTP. Please wait for %1$s{{remaining_time}}%2$s',
							'miniorange-otp-verification'
						),
						'<span id ="mo-time-remain" value = "{{remaining_time}}">',
						'</span>'
					),

					self::LIMIT_OTP_SENT                => __( 'Your OTP has been sent. The next OTP can be sent after {minutes}:{seconds} minutes', 'miniorange-otp-verification' ),

					self::USER_IS_BLOCKED_AJAX          => __( 'You have exceeded the limit to send OTP. Please wait for {minutes}:{seconds} minutes', 'miniorange-otp-verification' ),

					self::ERROR_OTP_VERIFY              => __( 'The next OTP can be sent after {minutes}:{seconds} minutes', 'miniorange-otp-verification' ),

					self::VOIP_PHONE_FORMAT             => __( '##phone## is not a valid phone number. Please enter a valid Phone Number.', 'miniorange-otp-verification' ),
					self::USER_LOGGING_IN               => __( 'Verified. Logging in..', 'miniorange-otp-verification' ),
					self::USER_LOGGED_IN                => __( 'You are already logged in!', 'miniorange-otp-verification' ),
					self::NEW_USER_REGISTERED           => __( 'Verified. Registering your account.', 'miniorange-otp-verification' ),
					self::INVALID_FILE_PATH             => __( 'Invalid file path. Please check the file path and try again.', 'miniorange-otp-verification' ),

				)
			);

			return $frontend_messages;
		}


		/**
		 * This function is used to get the messages for the plugin.
		 *
		 * @return array
		 */
		public static function mo_get_messages() {
			$messages = maybe_serialize(
				array(

					// General Messages.
					self::BLOCKED_COUNTRY               => __( 'This country is blocked by the admin. Please enter another phone number or contact site admin.', 'miniorange-otp-verification' ),
					self::NEED_TO_REGISTER              => __( 'You need to login with the miniOrange account in the plugin in order to send the OTP Code.', 'miniorange-otp-verification' ),
					self::GLOBALLY_INVALID_PHONE_FORMAT => __( '##phone## is not a Globally valid phone number. Please enter a valid Phone Number.', 'miniorange-otp-verification' ),
					self::VOIP_PHONE_FORMAT             => __( '##phone## is not a valid phone number. Please enter a valid Phone Number.', 'miniorange-otp-verification' ),
					self::INVALID_SCRIPTS               => __( 'You cannot add script tags in the pop up template.', 'miniorange-otp-verification' ),

					self::OTP_SENT_PHONE                => __( 'A OTP (One Time Passcode) has been sent to ##phone##. Please enter the OTP in the field below to verify your phone.', 'miniorange-otp-verification' ),

					self::OTP_SENT_EMAIL                => __( 'A One Time Passcode has been sent to ##email##. Please enter the OTP below to verify your Email Address. If you cannot see the email in your inbox, make sure to check your SPAM folder.', 'miniorange-otp-verification' ),

					self::FORM_IS_NOT_FOUND             => sprintf(
						/* translators: %1$s: opening div tag, %2$s: opening anchor tag, %3$s: closing anchor tag, %4$s: closing div tag, %5$s: support email address */
						__(
							'%1$sThe form is not available in the form list. Please contact us at %2$s%5$s%3$s with details about your form to check the compatibility.%4$s',
							'miniorange-otp-verification'
						),
						'<div id="mo-no-results-message" class="font-normal rounded-smooth bg-blue-50 py-mo-3">',
						'<a style="display:inline; color:blue; font-style:italic; text-decoration:underline; cursor:pointer; padding:0;" onClick="otpSupportOnClick(\'I want to enable OTP verification on ____ Forms. I am unable to find my form in the supported forms list of the plugin. Could you assist me with the steps to configure OTP verification on my form?\');">',
						'</a>',
						'</div>',
						esc_html( MoConstants::FEEDBACK_EMAIL )
					),
					self::ERROR_OTP_EMAIL               => __( 'There was an error in sending the OTP. Please enter a valid email id or contact site Admin.', 'miniorange-otp-verification' ),

					self::ERROR_OTP_PHONE               => __( 'There was an error in sending the OTP to the given Phone. Please Try Again or contact site Admin.', 'miniorange-otp-verification' ),

					self::ERROR_PHONE_FORMAT            => __( '##phone## is not a valid phone number. Please enter a valid Phone Number. E.g:+1XXXXXXXXXX', 'miniorange-otp-verification' ),

					self::ERROR_EMAIL_FORMAT            => __( '##email## is not a valid email address. Please enter a valid Email Address. E.g:abc@abc.abc', 'miniorange-otp-verification' ),

					self::INVALID_EMAIL                 => sprintf(
						/* translators: %1$s: opening bold tag, %2$s: opening italic tag, %3$s: opening anchor tag, %4$s: closing anchor tag, %5$s: closing italic tag, %6$s: closing bold tag */
						__( 'Invalid Email address. Please register using a valid Email Address or contact us at %1$s%2$s%3$s <u>%4$s</u>%5$s%6$s to know more.', 'miniorange-otp-verification' ),
						'<b>',
						'<i>',
						'<a style="cursor:pointer;" onClick="otpSupportOnClick();">',
						'</a>',
						'</i>',
						'</b>'
					),

					self::INVALID_USER                  => __( 'The customer is not valid', 'miniorange-otp-verification' ),

					self::INVALID_PASSWORD              => __( 'Invalid username or password. Please try again.', 'miniorange-otp-verification' ),

					self::CHOOSE_METHOD                 => __( 'Please select one of the methods below to verify your account. A One time passcode will be sent to the selected method.', 'miniorange-otp-verification' ),

					self::PLEASE_VALIDATE               => __( 'You need to verify yourself in order to submit this form', 'miniorange-otp-verification' ),

					self::ERROR_PHONE_BLOCKED           => __( '##phone## has been blocked by the admin. Please Try a different number or Contact site Admin.', 'miniorange-otp-verification' ),

					self::ERROR_EMAIL_BLOCKED           => __( '##email## has been blocked by the admin. Please Try a different email or Contact site Admin.', 'miniorange-otp-verification' ),

					self::REGISTER_WITH_US              => sprintf(
						/* translators: %1$s: opening underline tag, %2$s: opening italic tag, %3$s: opening anchor tag with href to miniOrange dashboard, %4$s: closing anchor tag, %5$s: closing italic tag, %6$s: closing underline tag */
						__(
							'%1$s%2$s%3$sRegister or Login with miniOrange%4$s%5$s%6$s to get the free Email Transactions.',
							'miniorange-otp-verification'
						),
						'<u>',
						'<i>',
						'<a href="{{url}}">',
						'</a>',
						'</i>',
						'</u>'
					),

					self::ACTIVATE_PLUGIN               => sprintf(
						/* translators: %1$s: opening anchor tag, %2$s: opening underline tag, %3$s: opening italic tag, %4$s: closing italic tag, %5$s: closing underline tag, %6$s: closing anchor tag */
						__(
							'%1$s%2$s%3$sComplete plugin activation process%4$s%5$s%6$s to enable OTP Verification',
							'miniorange-otp-verification'
						),
						'<a href="{{url}}">',
						'<u>',
						'<i>',
						'</i>',
						'</u>',
						'</a>'
					),

					self::CONFIG_GATEWAY                => sprintf(
						/* translators: %1$s: opening anchor tag, %2$s: opening underline tag, %3$s: opening italic tag, %4$s: closing italic tag, %5$s: closing underline tag, %6$s: closing anchor tag */
						__(
							'%1$s%2$s%3$sPlease Configure Gateway%4$s%5$s%6$s to enable OTP Verification',
							'miniorange-otp-verification'
						),
						'<a style="cursor:pointer;" onClick="otpSupportOnClick();">',
						'<u>',
						'<i>',
						'</i>',
						'</u>',
						'</a>'
					),
					self::FORM_NOT_AVAIL_HEAD           => __( 'MY FORM IS NOT IN THE LIST', 'miniorange-otp-verification' ),

					self::FORM_NOT_FOUND                => __( 'Not able to find your form.', 'miniorange-otp-verification' ),
					self::FORM_NOT_AVAIL_BODY           => sprintf(
						/* translators: %1$s: opening anchor tag with onclick handler, %2$s: opening span tag with white color style, %3$s: opening underline tag, %4$s: support email address, %5$s: closing underline tag, %6$s: closing span tag, %7$s: closing anchor tag*/
						__(
							'We are continuously adding support for more forms. Contact us via the support form or email us at %1$s%2$s%3$s%4$s%5$s%6$s%7$s with details about your form and its usage.',
							'miniorange-otp-verification'
						),
						'<a onClick="otpSupportOnClick();">',
						'<span style="color:white;">',
						'<u>',
						esc_html( MoConstants::FEEDBACK_EMAIL ),
						'</u>',
						'</span>',
						'</a>'
					),
					self::PREMIUM_FORM_MESSAGE          => sprintf(
						/* translators: %1$s opening bold tag, %2$s opening anchor tag linking to license URL (target=_blank), %3$s closing anchor tag, %4$s closing bold tag, %5$s line break (<br>), %6$s opening anchor tag with onclick handler for support, %7$s opening underline tag, %8$s closing underline tag, %9$s closing anchor tag for support link */
						__(
							'is available in the %1$s%2$s{{plan_name}}%3$s%4$s.%5$s%5$sThis feature allows users to log in and register using only their phone number ( no email address or password required ).%5$sUpgrade to the WooCommerce OTP and Notification Plan to unlock this functionality.%5$s%5$sFor a demo, contact us at %6$s%7$s{{support_email}}%8$s%9$s.',
							'miniorange-otp-verification'
						),
						'<b>',
						'<a class="mo_links" href="{{license_url}}" target="_blank">',
						'</a>',
						'</b>',
						'<br>',
						'<a style="cursor:pointer;" onClick="otpSupportOnClick();">',
						'<u>',
						'</u>',
						'</a>'
					),
					self::DLT_TEMPLATE_TITLE            => __( 'If your targeted country is India:', 'miniorange-otp-verification' ),
					self::DLT_TEMPLATE_BODY             => sprintf(
						/* translators: %1$s opening italic tag, %2$s opening underline tag, %3$s opening anchor tag to DLT portal, %4$s closing anchor tag, %5$s closing underline tag, %6$s closing italic tag, %7$s opening italic tag, %8$s opening anchor tag for support link, %9$s opening underline tag, %10$s support email address, %11$s closing underline tag, %12$s closing anchor tag for support link, %13$s closing italic tag */
						__(
							'As per Government of India regulations, Custom SMS templates and Sender IDs must be registered on the DLT platform. To learn more about the registration process, visit %1$s%2$s%3$sDLT portal.%4$s%5$s%6$s( If you are using the miniOrange gateway once the template is registered, contact us at %7$s%8$s%9$s%10$s%11$s%12$s%13$s )',
							'miniorange-otp-verification'
						),
						'<i>',
						'<u>',
						'<a href="https://plugins.miniorange.com/dlt-registration-process-for-sending-sms" target="_blank" class="mo-dlt-portal-link">',
						'</a>',
						'</u>',
						'</i>',
						'<i>',
						'<a class="cursor-pointer text-blue-600 font-semibold" onclick="otpSupportOnClick(\'Hi! I would like to update the SMS template for India. Could you please provide me with the details of the DLT registration process?\');">',
						'<u>',
						esc_html( MoConstants::FEEDBACK_EMAIL ),
						'</u>',
						'</a>',
						'</i>'
					),
					self::CHANGE_SENDER_ID_BODY         => __( 'SenderID/Number is gateway specific. You will need to use your own SMS gateway for this.', 'miniorange-otp-verification' ),

					self::CHANGE_SENDER_ID_HEAD         => __( 'CHANGE SENDER ID / NUMBER', 'miniorange-otp-verification' ),

					self::CHANGE_EMAIL_ID_BODY          => __( 'Sender Email is gateway specific. You will need to use your own Email gateway for this.', 'miniorange-otp-verification' ),

					self::CHANGE_EMAIL_ID_HEAD          => __( 'CHANGE SENDER EMAIL ADDRESS', 'miniorange-otp-verification' ),

					self::INFO_HEADER                   => __( 'WHAT DOES THIS MEAN?', 'miniorange-otp-verification' ),

					self::META_KEY_HEADER               => __( 'WHAT IS A META KEY?', 'miniorange-otp-verification' ),

					self::META_KEY_BODY                 => __( 'WordPress stores addtional user data like phone number, username etc in the usermeta table in a key value pair. Phone Meta Key is the key against which the users phone number is stored in the usermeta table.', 'miniorange-otp-verification' ),

					self::ENABLE_BOTH_BODY              => __( 'New users can validate their Email or Phone Number using either Email or Phone verification. They will be prompted during registration to choose one of the two verification methods.', 'miniorange-otp-verification' ),

					self::EMAIL_SENDER_HEADER           => __( 'Change From Email Address?', 'miniorange-otp-verification' ),

					self::EMAIL_SENDER_BODY             => __( 'Upgrading to the premium plan allows you to change the from email address, which is currently set as no-reply@xecurify.com.', 'miniorange-otp-verification' ),

					self::COUNTRY_CODE_HEAD             => __( 'DON\'T WANT USERS TO ENTER THEIR COUNTRY CODE?', 'miniorange-otp-verification' ),

					self::COUNTRY_CODE_BODY             => __( 'Choose the default country code that will be appended to the phone number entered by the users. This will allow your users to enter their phone numbers in the phone field without a country code.', 'miniorange-otp-verification' ),

					self::WC_GUEST_CHECKOUT_HEAD        => __( 'WHAT IS GUEST CHECKOUT?', 'miniorange-otp-verification' ),

					self::WC_GUEST_CHECKOUT_BODY        => __( 'Verify customer only when he is not logged in during checkout.', 'miniorange-otp-verification' ),

					self::SUPPORT_FORM_VALUES           => __( 'Please submit your query along with email.', 'miniorange-otp-verification' ),

					self::SUPPORT_FORM_SENT             => __( 'Thanks for getting in touch! We shall get back to you shortly.', 'miniorange-otp-verification' ),

					self::PREM_SUPPORT_FORM_SENT        => __( 'Thanks for getting in touch! We shall get back to you shortly. You can also purchase the support plan to raise the priority of the ticket.', 'miniorange-otp-verification' ),

					self::SUPPORT_FORM_ERROR            => __( 'Your query could not be submitted. Please try again.', 'miniorange-otp-verification' ),

					self::FEEDBACK_SENT                 => __( 'Thank you for your feedback.', 'miniorange-otp-verification' ),

					self::FEEDBACK_ERROR                => __( 'Your feedback couldn\'t be submitted. Please try again', 'miniorange-otp-verification' ),

					self::SETTINGS_SAVED                => __( 'Settings saved successfully. You can go to your registration form page to test the plugin.', 'miniorange-otp-verification' ),

					self::REG_ERROR                     => __( 'Please register an account before trying to enable OTP verification for any form.', 'miniorange-otp-verification' ),

					self::MSG_TEMPLATE_SAVED            => __( 'Settings saved successfully.', 'miniorange-otp-verification' ),

					self::SMS_TEMPLATE_SAVED            => __( 'Your SMS configurations are saved successfully.', 'miniorange-otp-verification' ),

					self::SMS_TEMPLATE_ERROR            => __( 'Please configure your gateway URL correctly.', 'miniorange-otp-verification' ),

					self::TEMPLATE_GUIDELINE_ALERT      => __( 'We have released some changes to our miniOrange gateway guidelines. According to the new guidelines, you cannot add any special character without spaces around it.', 'miniorange-otp-verification' ),

					self::EMAIL_TEMPLATE_SAVED          => __( 'Your email configurations are saved successfully.', 'miniorange-otp-verification' ),

					self::CUSTOM_MSG_SENT               => __( 'Message sent successfully', 'miniorange-otp-verification' ),

					self::CUSTOM_MSG_SENT_FAIL          => __( 'Error in sending message.', 'miniorange-otp-verification' ),

					self::EXTRA_SETTINGS_SAVED          => __( 'Settings saved successfully.', 'miniorange-otp-verification' ),

					self::NINJA_FORM_FIELD_ERROR        => __( 'Please fill in the form id and field id of your Ninja Form', 'miniorange-otp-verification' ),

					self::NINJA_CHOOSE                  => __( 'Please choose a Verification Method for Ninja Form.', 'miniorange-otp-verification' ),

					self::EMAIL_MISMATCH                => __( 'The email OTP was sent to and the email in contact submission do not match.', 'miniorange-otp-verification' ),
					self::PHONE_MISMATCH                => __( 'The phone number OTP was sent to and the phone number in contact submission do not match.', 'miniorange-otp-verification' ),

					self::ENTER_PHONE                   => __( 'You will have to provide a Phone Number before you can verify it.', 'miniorange-otp-verification' ),

					self::ENTER_EMAIL                   => __( 'You will have to provide an Email Address before you can verify it.', 'miniorange-otp-verification' ),

					self::USERNAME_MISMATCH             => __( 'Username that the OTP was sent to and the username submitted do not match', 'miniorange-otp-verification' ),

					self::CF7_PROVIDE_EMAIL_KEY         => __( 'Please Enter the name of the email address field you created in Contact Form 7.', 'miniorange-otp-verification' ),

					self::CF7_CHOOSE                    => __( 'Please choose a Verification Method for Contact Form 7.', 'miniorange-otp-verification' ),

					self::BP_PROVIDE_FIELD_KEY          => __( 'Please Enter the Name of the phone number field you created in BuddyPress.', 'miniorange-otp-verification' ),

					self::BP_CHOOSE                     => __( 'Please choose a Verification Method for BuddyPress Registration Form.', 'miniorange-otp-verification' ),

					self::UM_CHOOSE                     => __( 'Please choose a Verification Method for Ultimate Member Registration Form.', 'miniorange-otp-verification' ),

					self::UM_PROFILE_CHOOSE             => __( 'Please choose a Verification Method for Ultimate Member Profile/Account Form', 'miniorange-otp-verification' ),

					self::EVENT_CHOOSE                  => __( 'Please choose a Verification Method for Event Registration Form.', 'miniorange-otp-verification' ),

					self::UULTRA_PROVIDE_FIELD          => __( 'Please Enter the Field Key of the phone number field you created in Users Ultra Registration form.', 'miniorange-otp-verification' ),

					self::UULTRA_CHOOSE                 => __( 'Please choose a Verification Method for Users Ultra Registration Form.', 'miniorange-otp-verification' ),

					self::CRF_PROVIDE_PHONE_KEY         => __( 'Please Enter the label name of the phone number field you created in Custom User Registration form.', 'miniorange-otp-verification' ),
					self::CRF_PROVIDE_EMAIL_KEY         => __( 'Please Enter the label name of the email number field you created in Custom User Registration form.', 'miniorange-otp-verification' ),

					self::CRF_CHOOSE                    => __( 'Please choose a Verification Method for Custom User Registration Form.', 'miniorange-otp-verification' ),

					self::SMPLR_PROVIDE_FIELD           => __( 'Please Enter the Field Key of the phone number field you created in Simplr User Registration form.', 'miniorange-otp-verification' ),

					self::SIMPLR_CHOOSE                 => __( 'Please choose a Verification Method for Simplr User Registration Form.', 'miniorange-otp-verification' ),

					self::UPME_PROVIDE_PHONE_KEY        => __( 'Please Enter the Field Key of the phone number field you created in User Profile Made Easy Registration form.', 'miniorange-otp-verification' ),

					self::UPME_CHOOSE                   => __( 'Please choose a Verification Method for User Profile Made Easy Registration Form.', 'miniorange-otp-verification' ),

					self::PB_PROVIDE_PHONE_KEY          => __( 'Please Enter the Field Key of the phone number field you created in Profile Builder Registration form.', 'miniorange-otp-verification' ),

					self::PB_CHOOSE                     => __( 'Please choose a Verification Method for Profile Builder Registration Form.', 'miniorange-otp-verification' ),

					self::PIE_PROVIDE_PHONE_KEY         => __( 'Please Enter the Meta Key of the phone field.', 'miniorange-otp-verification' ),

					self::PIE_CHOOSE                    => __( 'Please choose a Verification Method for Pie Registration Form.', 'miniorange-otp-verification' ),

					self::ENTER_PHONE_CODE              => __( 'Please enter the verification code sent to your phone', 'miniorange-otp-verification' ),

					self::ENTER_EMAIL_CODE              => __( 'Please enter the verification code sent to your email address', 'miniorange-otp-verification' ),

					self::ENTER_VERIFY_CODE             => __( 'Please verify yourself before submitting the form.', 'miniorange-otp-verification' ),

					self::ENTER_PHONE_VERIFY_CODE       => __( 'Please verify your phone number before submitting the form.', 'miniorange-otp-verification' ),

					self::ENTER_EMAIL_VERIFY_CODE       => __( 'Please verify your email address before submitting the form.', 'miniorange-otp-verification' ),

					self::PHONE_VALIDATION_MSG          => __( 'Enter your mobile number below for verification :', 'miniorange-otp-verification' ),

					self::WC_CHOOSE_METHOD              => __( 'Please choose a Verification Method for Woocommerce Default Registration Form.', 'miniorange-otp-verification' ),
					self::WC_CHECKOUT_CHOOSE            => __( 'Please choose a Verification Method for Woocommerce Checkout Registration Form.', 'miniorange-otp-verification' ),
					self::TMLM_CHOOSE                   => __( 'Please choose a Verification Method for Theme My Login Registration Form.', 'miniorange-otp-verification' ),

					self::ENTER_PHONE_DEFAULT           => __( 'ERROR: Please enter a valid phone number.', 'miniorange-otp-verification' ),

					self::WP_CHOOSE_METHOD              => __( 'Please choose a Verification Method for WordPress Default Registration Form.', 'miniorange-otp-verification' ),

					self::AUTO_ACTIVATE_HEAD            => __( 'WHAT DO YOU MEAN BY AUTO ACTIVATE?', 'miniorange-otp-verification' ),

					self::AUTO_ACTIVATE_BODY            => __( 'By default WordPress sends out a confirmation email to new registrants to complete their registration process. The plugin would add a password and confirm password field on the registration page and auto-activate the users after registration.', 'miniorange-otp-verification' ),

					self::USERPRO_CHOOSE                => __( 'Please choose a Verification Method for UserPro Registration Form.', 'miniorange-otp-verification' ),

					self::PASS_LENGTH                   => __( 'Choose a password with minimum length 6.', 'miniorange-otp-verification' ),

					self::PASS_MISMATCH                 => __( 'Password and Confirm Password do not match.', 'miniorange-otp-verification' ),

					self::OTP_SENT                      => __( 'A passcode has been sent to {{method}}. Please enter the otp below to verify your account. If you cannot see the email in your inbox, make sure to check your SPAM folder.', 'miniorange-otp-verification' ),

					self::ERR_OTP                       => __( 'There was an error in sending OTP. Please click on Resend OTP link to resend the OTP.', 'miniorange-otp-verification' ),

					self::REG_SUCCESS                   => __( 'Your account has been retrieved successfully.', 'miniorange-otp-verification' ),

					self::ACCOUNT_EXISTS                => __( 'You already have an account with miniOrange. Please enter a valid password.', 'miniorange-otp-verification' ),

					self::REG_COMPLETE                  => __( 'Registration complete!', 'miniorange-otp-verification' ),

					self::INVALID_OTP                   => __( 'Invalid one time passcode. Please enter a valid passcode.', 'miniorange-otp-verification' ),

					self::RESET_PASS                    => __( 'You password has been reset successfully and sent to your registered email. Please check your mailbox.', 'miniorange-otp-verification' ),

					self::REQUIRED_FIELDS               => __( 'Please enter all the required fields', 'miniorange-otp-verification' ),

					self::REQUIRED_OTP                  => __( 'Please enter a value in OTP field.', 'miniorange-otp-verification' ),

					self::INVALID_SMS_OTP               => __( 'There was an error in sending sms. Please Check your phone number.', 'miniorange-otp-verification' ),

					self::NEED_UPGRADE_MSG              => __( 'You have not upgraded yet. Check licensing tab to upgrade to premium version.', 'miniorange-otp-verification' ),

					self::VERIFIED_LK                   => __( 'Your license is verified. You can now setup the plugin.', 'miniorange-otp-verification' ),

					self::LK_IN_USE                     => __( 'License key you have entered has already been used. Please enter a key which has not been used before on any other instance or if you have exhausted all your keys then check licensing tab to buy more.', 'miniorange-otp-verification' ),

					self::INVALID_LK                    => __( 'You have entered an invalid license key. Please enter a valid license key.', 'miniorange-otp-verification' ),

					self::REG_REQUIRED                  => __( 'Please complete your registration to save configuration.', 'miniorange-otp-verification' ),

					self::UNKNOWN_ERROR                 => __( 'Error processing your request. Please try again.', 'miniorange-otp-verification' ),
					self::INVALID_OP                    => __( 'Invalid Operation. Please Try Again', 'miniorange-otp-verification' ),

					self::MO_REG_ENTER_PHONE            => __( 'Phone with country code eg. +1xxxxxxxxxx', 'miniorange-otp-verification' ),

					self::UPGRADE_MSG                   => sprintf(
						/* translators: %1$s: line break tag, %2$s: opening bold tag, %3$s: opening underline tag, %4$s: opening anchor tag, %5$s: closing anchor tag, %6$s: closing underline tag, %7$s: closing bold tag */
						__(
							'Thank you. You have upgraded to {{plan}}. %1$s%2$sYou can follow this %3$s%4$sguide%5$s%6$s to install the premium plugin.%7$s',
							'miniorange-otp-verification'
						),
						'<br>',
						'<b>',
						'<u>',
						'<a href="https://faq.miniorange.com/knowledgebase/premium-plugin-installation/" target="_blank">',
						'</a>',
						'</u>',
						'</b>'
					),
					self::REMAINING_TRANSACTION_MSG     => __( 'Thank you. You have upgraded to {{plan}}. <br>You have <b>{{sms}}</b> SMS and <b>{{email}}</b> Email remaining.', 'miniorange-otp-verification' ),

					self::FREE_PLAN_MSG                 => __( 'You are on our FREE plan. Check Licensing Tab to learn how to upgrade.', 'miniorange-otp-verification' ),

					self::TRANS_LEFT_MSG                => __( 'You have <b><i>{{email}} Email Transactions</i></b> and <b><i>{{phone}} Phone Transactions</i></b> remaining.', 'miniorange-otp-verification' ),

					self::YOUR_GATEWAY_HEADER           => __( 'WHAT DO YOU MEAN BY CUSTOM GATEWAY? WHEN DO I OPT FOR THIS PLAN?', 'miniorange-otp-verification' ),

					self::YOUR_GATEWAY_BODY             => sprintf(
						/* translators: %1$s line breaks, %2$s opening bold tag, %3$s opening italic tag, %4$s closing italic tag, %5$s closing bold tag */
						__(
							'Custom Gateway means that you have your own SMS or Email Gateway for delivering OTP to the user\'s email or phone.%1$s%1$sThe plugin will handle OTP generation and verification but your existing gateway would be used to deliver the message to the user. Hence, the One Time Cost of the plugin. NOTE: You will still need to pay SMS and Email delivery charges to your gateway separately.',
							'miniorange-otp-verification'
						),
						'<br/><br/>',
						'<b>',
						'<i>',
						'</i>',
						'</b>'
					),

					self::MO_GATEWAY_HEADER             => __( 'WHAT DO YOU MEAN BY miniOrange GATEWAY? WHEN DO I OPT FOR THIS PLAN?', 'miniorange-otp-verification' ),

					self::MO_GATEWAY_BODY               => __( 'miniOrange Gateway means that you want the complete package of OTP generation, delivery ( to user\'s phone or email ) and verification. Opt for this plan when you don\'t have your own SMS or Email gateway for message delivery. NOTE: SMS Delivery charges depend on the country you want to send the OTP to. Click on the Upgrade Now button below and select your country to see the full pricing.', 'miniorange-otp-verification' ),
					self::INSTALL_PREMIUM_PLUGIN        => sprintf(
						/* translators: %1$s: opening anchor tag with target _blank and href to miniOrange dashboard, %2$s: closing anchor tag */
						__(
							'You have Upgraded to the Custom Gateway Plugin. You will need to install the premium plugin from the %1$sminiOrange dashboard%2$s.',
							'miniorange-otp-verification'
						),
						'<a target="_blank" href="' . esc_url( MOV_PORTAL . '/downloads' ) . '">',
						'</a>'
					),
					self::MO_PAYMENT                    => __( 'Payment Methods which we support', 'miniorange-otp-verification' ),

					self::GRAVITY_CHOOSE                => __( 'Please choose a Verification Method for Gravity Form.', 'miniorange-otp-verification' ),
					self::PLUGIN_INSTALL                => __( 'Please install the {{formname}} plugin', 'miniorange-otp-verification' ),
					self::PHONE_NOT_FOUND               => __( 'Sorry, but you don\'t have a registered phone number.', 'miniorange-otp-verification' ),

					self::REGISTER_PHONE_LOGIN          => __( 'A new security system has been enabled for you. Please register your phone to continue.', 'miniorange-otp-verification' ),

					self::WP_MEMBER_CHOOSE              => __( 'Please choose a Verification Method for WP Member Form.', 'miniorange-otp-verification' ),

					self::UMPRO_CHOOSE                  => __( 'Please choose a verification method for Ultimate Membership Pro form.', 'miniorange-otp-verification' ),

					self::CLASSIFY_THEME                => __( 'Please choose a Verification Method for Classify Theme.', 'miniorange-otp-verification' ),

					self::REALES_THEME                  => __( 'Please choose a Verification Method for Reales WP Theme.', 'miniorange-otp-verification' ),

					self::LOGIN_MISSING_KEY             => __( 'Please provide a meta key value for users phone numbers.', 'miniorange-otp-verification' ),

					self::PHONE_EXISTS                  => __( 'Phone Number is already in use. Please use another number.', 'miniorange-otp-verification' ),

					self::EMAIL_EXISTS                  => __( 'Email is already in use. Please use another email.', 'miniorange-otp-verification' ),

					self::WP_LOGIN_CHOOSE               => __( 'Please choose a Verification Method for WordPress Login Form', 'miniorange-otp-verification' ),

					self::WPCOMMENT_CHOOSE              => __( 'Please choose a Verification Method for WordPress Comments Form.', 'miniorange-otp-verification' ),
					self::WPCOMMENT_PHONE_ENTER         => __( 'Error: You did not add a phone number. Hit the Back button on your Web browser and resubmit your comment with a phone number.', 'miniorange-otp-verification' ),
					self::WPCOMMENT_VERIFY_ENTER        => __( 'Error: You did not add a Verification Code. Hit the Back button on your Web browser and resubmit your comment with a verification code.', 'miniorange-otp-verification' ),

					self::FORMCRAFT_CHOOSE              => __( 'Please choose a Verification Method for FormCraft Form.', 'miniorange-otp-verification' ),
					self::FORMCRAFT_FIELD_ERROR         => __( 'Please fill in the form id and field id of your FormCraft Form.', 'miniorange-otp-verification' ),

					self::WPEMEMBER_CHOOSE              => __( 'Please choose a Verification Method for WpEmember Registration Form.', 'miniorange-otp-verification' ),

					self::DOC_DIRECT_CHOOSE             => __( 'Please choose a Verification Method for DocDirect Theme.', 'miniorange-otp-verification' ),

					self::WPFORM_FIELD_ERROR            => __( 'Please check if you have provided all the required information for WP Forms.', 'miniorange-otp-verification' ),

					self::INVALID_USERNAME              => __( 'Please enter a valid username or email.', 'miniorange-otp-verification' ),

					self::UM_LOGIN_CHOOSE               => __( 'Please choose a verification method for Ultimate Member Login form.', 'miniorange-otp-verification' ),

					self::MEMBERPRESS_CHOOSE            => __( 'Please choose a verification method for Memberpress form.', 'miniorange-otp-verification' ),

					self::REQUIRED_TAGS                 => __( 'NOTE: Please make sure that the template has the {{TAG}} tag. It is necessary for the popup to work.', 'miniorange-otp-verification' ),

					self::TEMPLATE_SAVED                => __( 'Template Saved Successfully.', 'miniorange-otp-verification' ),
					self::TEMPLATE_RESET                => __( 'Template has been Reset to Default Successfully.', 'miniorange-otp-verification' ),

					self::DEFAULT_SMS_TEMPLATE          => __( 'Dear Customer, Your OTP is ##otp##. Use this Passcode to complete your transaction. Thank you - miniorange', 'miniorange-otp-verification' ),

					self::EMAIL_SUBJECT                 => __( 'Your Requested One Time Passcode', 'miniorange-otp-verification' ),

					self::DEFAULT_EMAIL_TEMPLATE        => __( 'Dear Customer, \\n\\nYour One Time Passcode for completing your transaction is: ##otp##\\nPlease use this Passcode to complete your transaction. Do not share this Passcode with anyone.\\n\\nThank You,\\nminiOrange Team.', 'miniorange-otp-verification' ),

					self::ADD_ON_VERIFIED               => __( 'Thank you for the upgrade. AddOn Settings have been verified.', 'miniorange-otp-verification' ),

					self::INVALID_PHONE                 => __( 'Please enter a valid phone number', 'miniorange-otp-verification' ),

					self::ERROR_SENDING_SMS             => __( 'There was an error sending SMS to the user', 'miniorange-otp-verification' ),

					self::SMS_SENT_SUCCESS              => __( 'SMS was sent successfully.', 'miniorange-otp-verification' ),

					self::VISUAL_FORM_CHOOSE            => __( 'Please Choose a verification method for Visual Form Builder', 'miniorange-otp-verification' ),

					self::FORMIDABLE_CHOOSE             => __( 'Please Choose a verification method for Formidable Forms', 'miniorange-otp-verification' ),

					self::FORMMAKER_CHOOSE              => __( 'Please Choose a verification method for FormMaker Forms.', 'miniorange-otp-verification' ),

					self::WC_BILLING_CHOOSE             => __( 'Please Choose a verification method for Woocommerce Billing Form', 'miniorange-otp-verification' ),
					self::ENTERPRIZE_EMAIL              => sprintf(
						/* translators: %1$s opening bold, %2$s opening italic, %3$s opening anchor with onclick, %4$s support email, %5$s closing anchor, %6$s closing italic, %7$s closing bold */
						__( 'Please use Enterprize Email for registration or contact us at %1$s%2$s%3$s%4$s%5$s%6$s%7$s to know more.', 'miniorange-otp-verification' ),
						'<b>',
						'<i>',
						'<a style="cursor:pointer;" onClick="otpSupportOnClick();">',
						esc_html( 'otpsupport@xecurify.com' ),
						'</a>',
						'</i>',
						'</b>'
					),

					self::REGISTRATION_ERROR            => sprintf(
						/* translators: %1$s opening bold, %2$s opening italic, %3$s opening anchor with onclick, %4$s support email, %5$s closing anchor, %6$s closing italic, %7$s closing bold */
						__( 'There is some issue processing the request. Please try again or contact us at %1$s%2$s%3$s%4$s%5$s%6$s%7$s to know more.', 'miniorange-otp-verification' ),
						'<b>',
						'<i>',
						'<a style="cursor:pointer;" onClick="otpSupportOnClick();">',
						esc_html( 'otpsupport@xecurify.com' ),
						'</a>',
						'</i>',
						'</b>'
					),

					self::FORGOT_PASSWORD_MESSAGE       => sprintf(
						/* translators: %1$s opening anchor tag, %2$s closing anchor tag */
						__( 'Please%1$s Click here %2$sto reset your password', 'miniorange-otp-verification' ),
						'<a href="https://portal.miniorange.com/forgotpassword" target="_blank">',
						'</a>'
					),

					self::CUSTOM_CHOOSE                 => __( 'Please choose a Verification Method for Your Own Form.', 'miniorange-otp-verification' ),

					self::GATEWAY_PARAM_NOTE            => __( 'You will need to place your SMS gateway URL in the above field.<br><br>Example:-http://alerts.sinfini.com/api/web2sms.php?username=XYZ&password=password& to=<b>##phone##</b>&sender=senderid& message=<b>##message##</b>', 'miniorange-otp-verification' ),

					self::CUSTOM_FORM_MESSAGE           => sprintf(
						/* translators: %1$s opening bold, %2$s closing bold, %3$s line break, %4$s opening anchor tag, %5$s support email, %6$s closing anchor */
						__( '%1$sYour test was successful!%2$s %3$s Please contact us at %4$s%5$s%6$s for full integration of your form.', 'miniorange-otp-verification' ),
						'<b>',
						'</b>',
						'<br>',
						'<a style="cursor:pointer;" onClick="otpSupportOnClick();">',
						esc_html( 'otpsupport@xecurify.com' ),
						'</a>'
					),

					self::LOW_TRANSACTION_ERROR         => __( 'There was an error in sending the OTP. Please try again or contact site admin.', 'miniorange-otp-verification' ),
					self::LOW_TRANSACTION_ALERT         => __( 'You will get the below error once you exhaust your remaining transactions:', 'miniorange-otp-verification' ),
					self::ZERO_TRANSACTION_ALERT        => __( 'You will get the below error while sending SMS OTP as you don\'t have SMS Transactions in your account:', 'miniorange-otp-verification' ),

					self::RESET_LABEL_OP                => __( 'To reset your password, please enter your registered phone number.', 'miniorange-otp-verification' ),
					self::USERNAME_NOT_EXIST            => __( 'We can\'t find an account registered with that address or username or phone number.', 'miniorange-otp-verification' ),
					self::RESET_LABEL                   => __( 'To reset your password, please enter your email address, username or phone number.', 'miniorange-otp-verification' ),

					self::ENTER_VERIFICATION_CODE       => __( 'Please enter a verification code to verify yourself', 'miniorange-otp-verification' ),
					self::REMOVE_PLUS_MESSAGE           => __( 'For some gateways, a + is automatically inserted into the SMS template. You can enable this option to remove the "+" if needed.', 'miniorange-otp-verification' ),
					self::REMOVE_PLUS_MESSAGE_HEADER    => __( 'When to Use the "+" Removal Option', 'miniorange-otp-verification' ),
					self::USER_IS_BLOCKED               => sprintf(
						/* translators: %1$s: opening span tag, %2$s: closing span tag */
						__(
							'You have exceeded the limit to send OTP. Please wait for %1$s{{remaining_time}}%2$s',
							'miniorange-otp-verification'
						),
						'<span id ="mo-time-remain" value = "{{remaining_time}}">',
						'</span>'
					),
					self::LIMIT_OTP_SENT                => __( 'Your OTP has been sent. The next OTP can be sent after {minutes}:{seconds} minutes', 'miniorange-otp-verification' ),
					self::USER_IS_BLOCKED_AJAX          => __( 'You have exceeded the limit to send OTP. Please wait for {minutes}:{seconds} minutes', 'miniorange-otp-verification' ),
					self::ENTER_VALID_INT               => __( 'Please enter a valid integer in the fields.', 'miniorange-otp-verification' ),
					self::ENTER_VALID_BLOCK_TIME        => __( 'The block timer should be greater than resend OTP timer', 'miniorange-otp-verification' ),
					self::ERROR_OTP_VERIFY              => __( 'The next OTP can be sent after {minutes}:{seconds} minutes', 'miniorange-otp-verification' ),
					self::VOIP_PHONE_TITLE              => __( 'What are VOIP Phone numbers?', 'miniorange-otp-verification' ),
					self::VOIP_PHONE_BODY               => __( 'A VOIP phone number is a virtual number that uses the internet for calls, not tied to a physical location.', 'miniorange-otp-verification' ),
					self::USE_YOUR_SMTP                 => sprintf(
						/* translators: %1$s: opening underline tag, %2$s: opening italic tag, %3$s: opening anchor tag, %4$s: closing anchor tag, %5$s: closing italic tag, %6$s: closing underline tag, %7$s: line break tag, %8$s: opening bold tag, %9$s: closing bold tag */
						__(
							'You can configure your SMTP gateway from any third party SMTP plugin( For e.g %1$s%2$s%3$sWP SMTP%4$s%5$s%6$s ) or php.ini file.%7$s%8$sNote:%9$s You don\'t need to configure any extra settings in our plugin.',
							'miniorange-otp-verification'
						),
						'<u>',
						'<i>',
						'<a href="https://wordpress.org/plugins/wp-mail-smtp/" target="_blank" >',
						'</a>',
						'</i>',
						'</u>',
						'<br>',
						'<b>',
						'</b>'
					),
					self::USE_YOUR_SMTP_HEADER          => __( 'CONFIGURE YOUR OWN SMTP', 'miniorange-otp-verification' ),
					self::NEW_ACCOUNT_NOTIF_SMS         => __( 'Thanks for creating an account on {site-name}. Your username is {username} -miniorange', 'miniorange-otp-verification' ),
					self::USER_LOGGING_IN               => __( 'Verified. Logging in..', 'miniorange-otp-verification' ),
					self::USER_LOGGED_IN                => __( 'You are already logged in!', 'miniorange-otp-verification' ),
					self::NEW_USER_REGISTERED           => __( 'Verified. Registering your account.', 'miniorange-otp-verification' ),
					self::DISABLE_WC_REG                => __( 'Please disable WooCommerce Registration form in order to enable this form.', 'miniorange-otp-verification' ),
					self::DISABLE_DOKAN_REG             => __( 'Please disable Dokan Registration form in order to enable this form.', 'miniorange-otp-verification' ),
					self::INVALID_FORM_DETAILS          => __( 'Enter valid form details.', 'miniorange-otp-verification' ),
					self::INVALID_PHONE_EMAIL_LABEL     => __( 'Invalid or incomplete form IDs: {{form_ids}}. Check labels and form existence.', 'miniorange-otp-verification' ),
					self::EMAIL_ALREADY_REGISTERED      => __( 'An account is already registered with your email address. Please login.', 'miniorange-otp-verification' ),
					self::INVALID_ACCOUNT_USERNAME      => __( 'Please enter a valid account username.', 'miniorange-otp-verification' ),
					self::USERNAME_ALREADY_TAKEN        => __( 'An account is already registered with that username. Please choose another.', 'miniorange-otp-verification' ),
					self::NONCE_FAILED                  => __( 'Security check failed. Please refresh the page and try again.', 'miniorange-otp-verification' ),
					self::LOGGED_OUT                    => __( 'Logged out successfully.', 'miniorange-otp-verification' ),

				)
			);
			return $messages;
		}



		/**
		 * This function is used to fetch and process the Messages to
		 * be shown to the user. It was created to mostly show dynamic
		 * messages to the user.
		 *
		 * @param string $message_keys Message Key.
		 * @param array  $data        The key value pair to be replaced in the message.
		 *
		 * @return string The formatted message.
		 */
		public static function showMessage( $message_keys, $data = array() ) {
			$display_message = '';
			$message_keys    = explode( ' ', sanitize_text_field( $message_keys ) );
			$messages        = maybe_unserialize( self::update_message_list( self::mo_get_messages() ) );
			foreach ( $message_keys as $message_key ) {
				if ( MoUtility::is_blank( $message_key ) ) {
					return $display_message;
				}
				$format_message = $messages[ $message_key ];
				foreach ( $data as $key => $value ) {
					$format_message = str_replace( '{{' . sanitize_key( $key ) . '}}', esc_html( $value ), $format_message );
				}
				$display_message .= $format_message;
			}
			return $display_message;
		}

		/**
		 * This function is used to fetch the original message list.
		 *
		 * @return array The original message list.
		 */
		public static function get_original_message_list() {
			$messages = maybe_unserialize( self::mo_get_messages() );
			return $messages;
		}
		/**
		 * This function is used to fetch the frontend message list.
		 *
		 * @return array The frontend message list.
		 */
		public static function get_frontend_message_list() {
			$messages = maybe_unserialize( self::update_message_list( self::mo_get_frontend_messages() ) );
			return $messages;
		}
		/**
		 * This function is used to return the updated message list.
		 *
		 * @param array $msg_list The original message list.
		 * @return array The updated message list.
		 */
		public static function update_message_list( $msg_list ) {
			$messages = maybe_unserialize( $msg_list );
			foreach ( $messages as $key => $value ) {
				$changed_template = get_mo_option( sanitize_key( $key ), 'mo_otp_' );
				if ( $changed_template ) {
					$messages[ $key ] = str_replace( $value, $changed_template, $messages[ $key ] );
				}
			}
			return $messages;
		}
	}
}
