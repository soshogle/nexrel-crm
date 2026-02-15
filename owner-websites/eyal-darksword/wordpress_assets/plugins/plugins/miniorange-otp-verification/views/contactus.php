<?php
/**
 * Load admin view for Contact Us pop up.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
if ( ! current_user_can( 'manage_options' ) ) {
	return;
}
echo '
<div class="w-[296px] contact-us-container duration-300"> 
    <div id="mo_contact_us" class="flex gap-mo-4 relative justify-end">
        <input id="contact-us-toggle" type="checkbox" class="peer sr-only"/>

        <span onClick="otpSupportOnClick(\'\')" class="mo_contact_us_box rounded-sm">
            <span class="mo-heading text-white leading-normal" style="font-size:14px;">' . esc_html__( 'Hello there! Need Help?', 'miniorange-otp-verification' ) . '<br>' . esc_html__( 'Drop us an Email', 'miniorange-otp-verification' ) . '</span>
        </span>

        <span onClick="otpSupportOnClick(\'\')">
            <svg width="60" height="60" viewBox="0 0 102 103" fill="none" class="cursor-pointer">
              <g id="d4c51d1a6d24c668e01e2eb6a39325d7">
                <rect width="102" height="103" rx="51" fill="url(#b69bc691e4b17a460c917ded85c3988c)"></rect>
                <g id="0df790d6c3b93208dd73e487cf02eedc">
                  <path id="e161bdf1e94ee39e424acc659f19e97c" fill-rule="evenodd" clip-rule="evenodd" d="M32 51.2336C32 37.5574 36.7619 33 51.0476 33C65.3333 33 70.0952 37.5574 70.0952 51.2336C70.0952 64.9078 65.3333 69.4672 51.0476 69.4672C36.7619 69.4672 32 64.9078 32 51.2336Z" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
                  <path id="c79e8f13aac8a6b146b9542a01c31ddc" d="M69.0957 44.2959C69.0957 44.2959 56.6508 55.7959 51.5957 55.7959C46.5406 55.7959 34.0957 44.2959 34.0957 44.2959" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
                </g>
              </g>
              <defs>
                <linearGradient id="b69bc691e4b17a460c917ded85c3988c" x1="0" y1="0" x2="102" y2="103" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#2563eb"></stop>
                  <stop offset="1" stop-color="#1d4ed8"></stop>
                </linearGradient>
              </defs>
            </svg>
        </span>
        <div class="mo_contactus_popup_container" style="display:none;">
        </div>
        <div id="mo-contact-form" class="mo_contactus_popup_wrapper rounded-md hidden animate-fade-in-up">
            <div class="mo-header">
                <h5 class="mo-heading flex-1">' . esc_html__( 'Contact us', 'miniorange-otp-verification' ) . '</h5>
                    <label class="mo-icon-button" onclick="mo_otp_contactus_goback()">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <g id="a8e87dce2cfc3c0d3b0cee61b2290011">
                          <path id="4988f6043ba0a8c6d0d29ca41557a1d8" d="M8.99033 1.00293L1.00366 8.9896" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                          <path id="7c0fb53a248addedc5d06bb436da0b4d" d="M9 9L1 1" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                        </g>
                      </svg>
                    </label>
            </div>
            <form name="f" method="post" action="" class="flex flex-col gap-mo-3 p-mo-6 mo-scrollable-div">';
			wp_nonce_field( $nonce );
			echo '
                <input type="hidden" name="option" value="mo_validation_contact_us_query_option">
                  
                        <div id="mo-chatbox" class="flex flex-col gap-mo-2">
                          <div>
                            <p class="leading-loose">' . esc_html__( 'Hi! 👋 it\'s great to see you! Please select the option you need help with.', 'miniorange-otp-verification' ) . '</p>
                          </div>
                          <div class="mo-cloud-message-initial" id="mo-demo">
                            ' . esc_html__( '1) Need the demo of the plugin', 'miniorange-otp-verification' ) . '
                          </div>
                          <div class="mo-cloud-message-initial" id="mo-gateway">
                            ' . esc_html__( '2) Need help with the gateway setup', 'miniorange-otp-verification' ) . '
                          </div>
                          <div class="mo-cloud-message-initial" id="mo-no-sms">
                            ' . esc_html__( '3) There was an error in sending the OTP. Please try again or contact site admin.', 'miniorange-otp-verification' ) . '
                          </div>
                          <div class="mo-cloud-message-initial hidden" id="mo-form">
                            ' . esc_html__( '3) Need help with the form setup', 'miniorange-otp-verification' ) . '
                          </div>
                          <div class="mo-cloud-message-initial" id="mo-premium">
                            ' . esc_html__( '4) Upgraded to the premium plan but unable to activate the premium plugin', 'miniorange-otp-verification' ) . '
                          </div>
                          <div class="mo-cloud-message-initial" id="mo-no-otp">
                            ' . esc_html__( '5) Not receiving the OTP’s', 'miniorange-otp-verification' ) . '
                          </div>
                          <div class="mo-cloud-message-initial" id="mo-custom">
                            ' . esc_html__( '6) Other query', 'miniorange-otp-verification' ) . '
                          </div>
                          
                        </div>
                  <div id="mo_email_form_link" class="hidden flex-col gap-mo-3" style="display:flex !important">
                    <div class="mo-input-wrapper">
                      <label class="mo-input-label">' . esc_html__( 'Email', 'miniorange-otp-verification' ) . '</label>
                        <input type="email" class="mo-input w-full mo-field-contactus" id="mo_query_email" name="mo_query_email" value="' . esc_attr( $email ) . '"
                          placeholder="' . esc_attr( __( 'Enter your Email', 'miniorange-otp-verification' ) ) . '" required />
                    </div>
                    <div id="mo_query_phone_input" class="mo-input-wrapper">
                      <label class="mo-input-label">' . esc_html__( 'Phone', 'miniorange-otp-verification' ) . '</label>
                        <input type="text" class="mo-input w-full mo-field-contactus" id="mo_query_phone" name="mo_query_phone" value="' . esc_attr( $phone ) . '"
                          placeholder="' . esc_attr( __( 'Enter your Phone', 'miniorange-otp-verification' ) ) . '"/>
                    </div>
                    <div class="mo-input-wrapper">
                      <label class="mo-input-label">' . esc_html__( 'Form link/name', 'miniorange-otp-verification' ) . '</label>
                      <input type="text" class="mo-input w-full mo-field-contactus" id="mo_query_form_link" name="mo_query_form_link"
                          placeholder="' . esc_attr( __( 'Enter your form link/name', 'miniorange-otp-verification' ) ) . '" required />
                    </div>
                  </div>
            </form> 
          </div>  
    </div>
</div>    
';
