<?php
/**
 * Load admin view for Ultimate Member password reset form.
 *
 * @package miniorange-otp-verification/views/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoMessages;

echo '	
        <div class="mo_otp_form" id="' . esc_attr( get_mo_class( $handler ) ) . '">
            <input type="checkbox" ' . esc_attr( $disabled ) . ' id="um_pass_reset_basic" class="app_enable" data-toggle="um_pass_reset_options" 
                name="mo_customer_validation_um_pass_reset_enable" value="1" ' . esc_attr( $is_um_pass_reset_enabled ) . ' />
                <strong>' . esc_html( $form_name ) . '</strong>
           
            <div class="mo_registration_help_desc" id="um_pass_reset_options">

                <b>' . esc_html__( 'Choose between Phone or Email Verification', 'miniorange-otp-verification' ) . '</b>
                <div>
                    <input type="radio" ' . esc_attr( $disabled ) . ' id="um_pass_reset_form_phone" class="app_enable" 
                    data-toggle="um_pass_reset_phone_option" name="mo_customer_validation_um_pass_reset_enable_type" 
                    value="' . esc_attr( $um_pass_reset_phone_type ) . '" ' . ( esc_attr( $um_pass_reset_enable_type ) === esc_attr( $um_pass_reset_phone_type ) ? 'checked' : '' ) . ' />
                    <strong>' . esc_html__( 'Enable Phone Verification', 'miniorange-otp-verification' ) . '</strong>
                </div>

           <div id="um_pass_reset_phone_option" 
					     class="mo_registration_help_desc">
                    ' . esc_html__( 'Follow the following steps to add a users phone number in the database', 'miniorange-otp-verification' ) . ':
                    <ol>
                    <li>' . esc_html__( 'Enter the phone User Meta Key.', 'miniorange-otp-verification' ) . '
							<div class="flex gap-mo-4 mt-mo-4">
								<div>
									<div class="mo-input-wrapper">
										<label class="mo-input-label">' . esc_html__( 'Phone User Meta Key', 'miniorange-otp-verification' ) . '</label>
										<input class=" mo-form-input" id="mo_customer_validation_um_pass_reset_field_key" placeholder="' . esc_attr__( 'Enter the phone User Meta Key', 'miniorange-otp-verification' ) . '" value="' . esc_attr( $um_pass_reset_phone_field_key ) . '" type="text" name="mo_customer_validation_um_pass_reset_field_key" >
									</div>
								</div>
								<div>';

								mo_draw_tooltip(
									MoMessages::showMessage( MoMessages::META_KEY_HEADER ),
									MoMessages::showMessage( MoMessages::META_KEY_BODY )
								);
								echo '
								</div>
							</div>
							<div class="mo_otp_note" style="margin-top:1%;">' . esc_html__( "If you don't know the metaKey against which the phone number is stored for all your users then put the default value as phone.", 'miniorange-otp-verification' ) . ' </div>
						</li> 
                           
                        <li>' . esc_html__( 'Click on the Save Button to save your settings.', 'miniorange-otp-verification' ) . '</li>
                    </ol>
                    <div>
					    <input  type="checkbox" ' . esc_attr( $disabled ) . ' 
							        name="mo_customer_validation_um_pass_reset_only_phone" 
							        value="1" ' . esc_attr( $um_pass_reset_only_phone_reset ) . ' />
                                    <strong>' . esc_html__( 'Use only Phone Number. Do not allow username or email to reset password.', 'miniorange-otp-verification' ) . ' </strong>
                    </div>
            </div>

         <div id="um_pass_reset_email_option">
            <input type="radio" ' . esc_attr( $disabled ) . ' id="um_pass_reset_form_email" class="app_enable" 
            data-toggle="um_pass_reset_email_option" name="mo_customer_validation_um_pass_reset_enable_type" 
            value="' . esc_attr( $um_pass_reset_email_type ) . '" ' . ( esc_attr( $um_pass_reset_enable_type ) === esc_attr( $um_pass_reset_email_type ) ? 'checked' : '' ) . ' />
            <strong>' . esc_html__( 'Enable Email Verification', 'miniorange-otp-verification' ) . '</strong>
        </div>

        <div>
					<div class="pt-mo-4">
						<div class="mo-input-wrapper">
							<label class="mo-input-label">' . esc_html__( 'Verification Button text', 'miniorange-otp-verification' ) . '</label>
							<input class=" mo-form-input" 
								placeholder="' . esc_attr__( 'Enter the verification button text', 'miniorange-otp-verification' ) . '" 
								value="' . esc_attr( $um_resetpass_button_text ) . '" 
								type="text" name="mo_customer_validation_um_pass_reset_button_text" >
						</div>
					</div>					
				</div>

       </div>
       </div>';
