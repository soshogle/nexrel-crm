<?php
/**
 * Load admin view for WcProfileForm.
 *
 * @package miniorange-otp-verification/views/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoMessages;

echo '	<div class="mo_otp_form" id="' . esc_attr( get_mo_class( $handler ) ) . '">
			<input  type="checkbox" ' . esc_attr( $disabled ) . '
					id="wc_ac_default" 
					data-toggle="wc_ac_default_options" 
					class="app_enable" 
					name="mo_customer_validation_wc_profile_enable" 
					value="1" ' . esc_attr( $wc_acc_enabled ) . ' />
			<strong>' . esc_html( $form_name ) . '</strong>
			<div class="mo_registration_help_desc"
				id="wc_ac_default_options">
				<div>
					<input  type ="radio" ' . esc_attr( $disabled ) . '
							id ="wc_profile_page" 
							class="app_enable" 
							name = "mo_customer_validation_wc_profile_enable_type" 
							value= "' . esc_attr( $wc_acc_type_email ) . '"
							data-toggle="wc_profile_email_instructions" 
							' . ( esc_attr( $wc_acc_enabled_type ) === esc_attr( $wc_acc_type_email ) ? 'checked' : '' ) . '/>
					<strong>' . esc_html__( 'Enable Email Verification', 'miniorange-otp-verification' ) . '</strong>
					<i>' . esc_html__( '( On change of Email Address )', 'miniorange-otp-verification' ) . '</i>
				</div>
				<div>
					<input  type ="radio" ' . esc_attr( $disabled ) . '
							id ="wc_profile_page" 
							class="app_enable" 
							name = "mo_customer_validation_wc_profile_enable_type" 
							value= "' . esc_attr( $wc_acc_type_phone ) . '"
							data-toggle="wc_profile_phone_instructions" 
							' . ( esc_attr( $wc_acc_enabled_type ) === esc_attr( $wc_acc_type_phone ) ? 'checked' : '' ) . '/>
					<strong>' . esc_html__( 'Enable Phone Verification', 'miniorange-otp-verification' ) . '</strong>
					<i>' . esc_html__( '(On change of Mobile Number)', 'miniorange-otp-verification' ) . '</i>
				</div>
				<div    ' . ( esc_attr( $wc_acc_enabled_type ) !== esc_attr( $wc_acc_type_phone ) ? 'hidden' : '' ) . '
						id="wc_profile_phone_instructions" 
						class="mo_registration_help_desc_internal">
					' . esc_html__( 'Follow the following steps to enable OTP Verification and save the user phone number in the database', 'miniorange-otp-verification' ) . ':
					<ol>
						<li>' . esc_html__( 'Enter the phone User Meta Key', 'miniorange-otp-verification' ) . '
							<div class="flex gap-mo-4 mt-mo-4">
								<div>
									<div class="mo-input-wrapper">
										<label class="mo-input-label">' . esc_html__( 'Phone User Meta Key', 'miniorange-otp-verification' ) . '</label>
										<input class=" mo-form-input" id="mo_customer_validation_wc_profile_phone_key_1_0" placeholder="' . esc_attr__( 'Enter the phone User Meta Key', 'miniorange-otp-verification' ) . '" value="' . esc_attr( $wc_profile_field_key ) . '" type="text" name="mo_customer_validation_wc_profile_phone_key" >
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
							<div class="mo_otp_note">
							' . esc_html__( "If you don't know the metaKey against which the phone number is stored for all your users then put the default value as phone.", 'miniorange-otp-verification' ) . '
							</div>
						</li>
						<li>' . esc_html__( 'Click on the Save Button to save your settings.', 'miniorange-otp-verification' ) . '</li>
					</ol>
					<input  type="checkbox" ' . esc_attr( $disabled ) . '
							id="wc_profile_admin" 
							name="mo_customer_validation_wc_profile_restrict_duplicates"    
							value="1"
							' . esc_attr( $wc_acc_restrict_duplicates ) . ' />
					<strong>
						' . esc_html__( 'Do not allow users to use the same phone number for multiple accounts.', 'miniorange-otp-verification' ) . '
					</strong>
				</div>
				<div class="pt-mo-4">
					<div class="mo-input-wrapper">
						<label class="mo-input-label">' . esc_html__( 'Verification Button text', 'miniorange-otp-verification' ) . '</label>
						<input class=" mo-form-input w-[40%]" placeholder="' . esc_attr__( 'Enter the verification button text', 'miniorange-otp-verification' ) . '" value="' . esc_attr( $wc_acc_button_text ) . '" type="text" name="mo_customer_validation_wc_profile_button_text" >
					</div>
				</div>
			</div>
		</div>';
