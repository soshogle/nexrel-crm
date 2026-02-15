<?php
/**
 * Load admin view for Ultimate Member Profile form.
 *
 * @package miniorange-otp-verification/views/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoMessages;

echo '<div class="mo_otp_form" id="' . esc_attr( get_mo_class( $handler ) ) . '">
	<input  type="checkbox" ' . esc_attr( $disabled ) . ' 
		id="um_ac_default" 
		data-toggle="um_ac_default_options" 
		class="app_enable" 
		name="mo_customer_validation_um_profile_enable" 
		value="1" ' . esc_attr( $um_acc_enabled ) . ' />
	<strong>' . esc_html( $form_name ) . '</strong>';

echo '<div class="mo_registration_help_desc" id="um_ac_default_options">
	<b>' . esc_html__( 'Choose the Pages you want to verify. Users will be asked verify their phone or email on update.', 'miniorange-otp-verification' ) . '</b>		
	<div>
		<input  type="radio" ' . esc_attr( $disabled ) . ' 
			id="um_ac_page" 
			class="app_enable" 
			name="mo_customer_validation_um_profile_enable_type" 
			value="' . esc_attr( $um_acc_type_email ) . '" 
			' . ( esc_attr( $um_acc_enabled_type ) === esc_attr( $um_acc_type_email ) ? 'checked' : '' ) . '/>
		<strong>' . esc_html__( 'Account Page', 'miniorange-otp-verification' ) . '</strong>
		<i>' . esc_html__( '( Email Verification )', 'miniorange-otp-verification' ) . '</i> 
	</div>

	<div>
		<input  type="radio" ' . esc_attr( $disabled ) . ' 
			id="um_profile_page" 
			class="app_enable" 
			name="mo_customer_validation_um_profile_enable_type" 
			value="' . esc_attr( $um_acc_type_phone ) . '"
			data-toggle="um_profile_phone_instructions" 
			' . ( esc_attr( $um_acc_enabled_type ) === esc_attr( $um_acc_type_phone ) ? 'checked' : '' ) . '/>
		<strong>' . esc_html__( 'Profile Page', 'miniorange-otp-verification' ) . '</strong>
		<i>' . esc_html__( '( Mobile Number Verification )', 'miniorange-otp-verification' ) . '</i>
		
		<div ' . ( esc_attr( $um_acc_enabled_type ) !== esc_attr( $um_acc_type_phone ) ? 'hidden' : '' ) . ' 
			id="um_profile_phone_instructions" 
			class="mo_registration_help_desc_internal">
			' . esc_html__( 'Follow the following steps to add a user phone number in the database', 'miniorange-otp-verification' ) . ':
			
			<ol>
				<li>' . esc_html__( 'Enter the phone User Meta Key.', 'miniorange-otp-verification' ) . '
					<div class="flex gap-mo-4 mt-mo-4">
						<div>
							<div class="mo-input-wrapper">
								<label class="mo-input-label">' . esc_html__( 'Phone User Meta Key', 'miniorange-otp-verification' ) . '</label>
								<input class="mo-input" id="mo_customer_validation_um_profile_phone_key_1_0" placeholder="' . esc_attr__( 'Enter the phone User Meta Key', 'miniorange-otp-verification' ) . '" value="' . esc_attr( $um_profile_field_key ) . '" type="text" name="mo_customer_validation_um_profile_phone_key" >
							</div>
						</div>
						<div>';

						mo_draw_tooltip(
							MoMessages::showMessage( MoMessages::META_KEY_HEADER ),
							MoMessages::showMessage( MoMessages::META_KEY_BODY )
						);
						echo '</div>
					</div>
					<div class="mo_otp_note" style="margin-top:1%; width: 70%;">' . esc_html__( "If you don't know the metaKey against which the phone number is stored for all your users then put the default value as phone.", 'miniorange-otp-verification' ) . ' </div>
				</li> 
				<li>' . esc_html__( 'Click on the Save Button to save your settings.', 'miniorange-otp-verification' ) . '</li>
			</ol>
		
			<input  type="checkbox" ' . esc_attr( $disabled ) . ' 
				id="um_profile_admin" 
				name="mo_customer_validation_um_profile_restrict_duplicates"	
				value="1"
				' . esc_attr( $um_acc_restrict_duplicates ) . ' />
			<strong>
				' . esc_html__( 'Do not allow users to use the same phone number for multiple accounts.', 'miniorange-otp-verification' ) . '
			</strong>
		</div>                                
	</div>
	
	<div>
		<input  type="radio" ' . esc_attr( $disabled ) . ' 
			id="um_profile_both" 
			class="app_enable" 
			name="mo_customer_validation_um_profile_enable_type" 
			value="' . esc_attr( $um_acc_type_both ) . '" 
			data-toggle="um_profile_both_instructions" 
			' . ( esc_attr( $um_acc_enabled_type ) === esc_attr( $um_acc_type_both ) ? 'checked' : '' ) . '/>
		<strong>' . esc_html__( 'Both Account and Profile Pages', 'miniorange-otp-verification' ) . '</strong>
		<i>' . esc_html__( '( Both Email and Mobile Number Verification )', 'miniorange-otp-verification' ) . '</i>
			
		<div ' . ( esc_attr( $um_acc_enabled_type ) !== esc_attr( $um_acc_type_both ) ? 'hidden' : '' ) . ' 
			id="um_profile_both_instructions" 
			class="mo_registration_help_desc_internal">
			' . esc_html__( 'Follow the following steps to add a users phone number in the database', 'miniorange-otp-verification' ) . ':  
			<ol>
				<li>' . esc_html__( 'Enter the phone User Meta Key.', 'miniorange-otp-verification' ) . '
					<div class="flex gap-mo-4 mt-mo-4">
						<div>
							<div class="mo-input-wrapper">
								<label class="mo-input-label">' . esc_html__( 'Phone User Meta Key', 'miniorange-otp-verification' ) . '</label>
								<input class="mo-input" id="mo_customer_validation_um_profile_phone_key_2_0" placeholder="' . esc_attr__( 'Enter the phone User Meta Key', 'miniorange-otp-verification' ) . '" value="' . esc_attr( $um_profile_field_key ) . '" type="text" name="mo_customer_validation_um_profile_phone_key" >
							</div>
						</div>
						<div>';

						mo_draw_tooltip(
							MoMessages::showMessage( MoMessages::META_KEY_HEADER ),
							MoMessages::showMessage( MoMessages::META_KEY_BODY )
						);
						echo '</div>
					</div>
					<div class="mo_otp_note" style="margin-top:1%; width: 70%;">' . esc_html__( "If you don't know the metaKey against which the phone number is stored for all your users then put the default value as phone.", 'miniorange-otp-verification' ) . ' </div>
				</li> 
				<li>' . esc_html__( 'Click on the Save Button to save your settings.', 'miniorange-otp-verification' ) . '</li>
			</ol>                            
			<input  type="checkbox" ' . esc_attr( $disabled ) . ' 
				id="um_profile_admin1" 
				name="mo_customer_validation_um_profile_restrict_duplicates"	
				value="1" 
				' . esc_attr( $um_acc_restrict_duplicates ) . ' />
			<strong>
				' . esc_html__( 'Do not allow users to use the same phone number for multiple accounts.', 'miniorange-otp-verification' ) . '
			</strong>
		</div>					
	</div>
	<div>
		<div class="pt-mo-4">
			<div class="mo-input-wrapper">
				<label class="mo-input-label">' . esc_html__( 'Verification Button text', 'miniorange-otp-verification' ) . '</label>
				<input class="mo-form-input" 
					placeholder="' . esc_attr__( 'Enter the verification button text', 'miniorange-otp-verification' ) . '" 
					value="' . esc_attr( $um_acc_button_text ) . '" 
					type="text" name="mo_customer_validation_um_profile_button_text" >
			</div>
		</div>	
	</div>     
</div>
</div>';
