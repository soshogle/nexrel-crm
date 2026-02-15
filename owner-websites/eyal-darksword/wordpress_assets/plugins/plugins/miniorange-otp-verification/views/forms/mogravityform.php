<?php
/**
 * Load admin view for Gravity form.
 *
 * @package miniorange-otp-verification/views/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;

echo '			<div class="mo_otp_form" id="' . esc_attr( get_mo_class( $handler ) ) . '">
							<input  type="checkbox" ' . esc_attr( $disabled ) . '
									id="gf_contact" class="app_enable"
									data-toggle="gf_contact_options"
									name="mo_customer_validation_gf_contact_enable"
									value="1" ' . esc_attr( $gf_enabled ) . ' /><strong>' . esc_html( $form_name ) . '</strong>';

echo '						<div class="mo_registration_help_desc" id="gf_contact_options">
								<div><input 	type="radio" ' . esc_attr( $disabled ) . ' id="gf_contact_email" class="app_enable"
											data-toggle="gf_contact_email_instructions"
											name="mo_customer_validation_gf_contact_type"
											value="' . esc_attr( $gf_type_email ) . '"
											' . ( esc_attr( $gf_enabled_type ) === esc_attr( $gf_type_email ) ? 'checked' : '' ) . ' />
									<strong>' . esc_html__( 'Enable Email Verification', 'miniorange-otp-verification' ) . '</strong>
								</div>

									<div ' . ( esc_attr( $gf_enabled_type ) !== esc_attr( $gf_type_email ) ? 'style="display:none"' : '' ) . '
									     class="mo_registration_help_desc_internal" id="gf_contact_email_instructions" >
										' . esc_html__( 'Follow the following steps to enable Email Verification for', 'miniorange-otp-verification' ) . ' Gravity form:
										<ol>
											<li><a style="color:#2271b1;" href="' . esc_url( $gf_field_list ) . '" target="_blank" rel="noopener noreferrer" class="mo_links">
											    ' . esc_html__( 'Click Here', 'miniorange-otp-verification' ) . '</a> ' . esc_html__( ' to see your list of the Gravity Forms.', 'miniorange-otp-verification' ) . '
											</li>
											<li>' . esc_html__( 'Click on the Edit option of your form', 'miniorange-otp-verification' ) . '</li>
											<li>' . esc_html__( 'Add an email field to your existing form', 'miniorange-otp-verification' ) . '</li>
											<li>' . esc_html__( 'Add a text field with label "Enter Validation Code" in your existing form.', 'miniorange-otp-verification' ) . '</li>
											<li>' . esc_html__( 'Click on the Edit option of your form', 'miniorange-otp-verification' ) . '</li>
											<li>' . esc_html__( 'Add the form id of your form below for which you want to enable Email verification:', 'miniorange-otp-verification' ) . '<br>
											<br/>' . esc_html__( 'Add Form', 'miniorange-otp-verification' ) . ' : <input  type="button"  value="+" ' . esc_attr( $disabled ) . '
																	onclick="add_gravity(\'email\',1);"
																	class="mo-form-button secondary" /><br/><br/>';

											$gf_form_results = get_multiple_form_select(
												$gf_otp_enabled,
												true,
												true,
												$disabled,
												1,
												'gravity',
												'Label'
											);
											$gfcounter1      = ! MoUtility::is_blank( $gf_form_results['counter'] ) ? max( $gf_form_results['counter'] - 1, 0 ) : 0;

											echo '
											</li>
											<li>' . esc_html__( 'Click on the Save Button to save your settings and keep a track of your Form Ids.', 'miniorange-otp-verification' ) . '</li>
										</ol>
								</div>
								<div><input 	type="radio" ' . esc_attr( $disabled ) . ' id="gf_contact_phone" class="app_enable"
											data-toggle="gf_contact_phone_instructions"
											name="mo_customer_validation_gf_contact_type"
											value="' . esc_attr( $gf_type_phone ) . '"
									' . ( esc_attr( $gf_enabled_type ) === esc_attr( $gf_type_phone ) ? 'checked' : '' ) . ' />
									<strong>' . esc_html__( 'Enable Phone Verification', 'miniorange-otp-verification' ) . '</strong>
								</div>
								<div ' . ( esc_attr( $gf_enabled_type ) !== esc_attr( $gf_type_phone ) ? 'style="display:none"' : '' ) . ' class="mo_registration_help_desc_internal" id="gf_contact_phone_instructions" >
										' . esc_html__( 'Follow the following steps to enable phone Verification for Gravity form', 'miniorange-otp-verification' ) . ':
										<ol>
											<li><a style="color:#2271b1;" href="' . esc_url( $gf_field_list ) . '" target="_blank" rel="noopener noreferrer" class="mo_links">
											    ' . esc_html__( 'Click Here', 'miniorange-otp-verification' ) . '</a> ' . esc_html__( ' to see your list of the Gravity Forms.', 'miniorange-otp-verification' ) . '</li>
											<li>' . wp_kses( __( 'Click on the <b>Edit</b> option of your Gravity form.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
											<li>' . esc_html__( 'Add a phone field to your existing form', 'miniorange-otp-verification' ) . '</li>
											<li>' . wp_kses( __( 'Set the Format of the Phone Field to <u>International only</u>.', 'miniorange-otp-verification' ), array( 'u' => array() ) ) . '</li>
											<li>' . esc_html__( 'Add a text field with label "Enter Validation Code" in your existing form.', 'miniorange-otp-verification' ) . '</li>
											<li>' . esc_html__( 'Add the form id of your form below for which you want to enable Phone verification', 'miniorange-otp-verification' ) . ':<br>
											<br/>' . esc_html__( 'Add Form', 'miniorange-otp-verification' ) . ' : <input type="button"  value="+" ' . esc_attr( $disabled ) . '
																	onclick="add_gravity(\'phone\',2);"
																	class="mo-form-button secondary"/><br/><br/>';

											$gf_form_results = get_multiple_form_select(
												$gf_otp_enabled,
												true,
												true,
												$disabled,
												2,
												'gravity',
												'Label'
											);
											$gfcounter2      = ! MoUtility::is_blank( $gf_form_results['counter'] ) ? max( $gf_form_results['counter'] - 1, 0 ) : 0;


											echo '</li>


											<li>' . esc_html__( 'Click on the Save Button to save your settings and keep a track of your Form Ids.', 'miniorange-otp-verification' ) . '</li>
										</ol>
								</div>
								<div style="margin-left:2%;" class="flex pt-mo-4 gap-mo-4">
									<div class="mo-input-wrapper">
										<label for="gf_button_text" class="mo-input-label">' . esc_html__( 'Verification Button text', 'miniorange-otp-verification' ) . '</label>
										<input id="mo_gf_button_text" class=" mo-form-input w-full" 
											placeholder="' . esc_attr__( 'Enter the verification button text', 'miniorange-otp-verification' ) . '" 
											value="' . esc_attr( $gf_button_text ) . '" 
											type="text" name="mo_customer_validation_gf_button_text" maxlength="100" >
									</div>
									<div class="mo-input-wrapper">
										<label for="gf_button_css" class="mo-input-label">' . esc_html__( 'Verification Button CSS', 'miniorange-otp-verification' ) . '</label>
										<input id="mo_gf_button_css" class=" mo-form-input w-full" 
											placeholder="' . esc_attr__( 'Enter the semicolon separated verification button CSS. Example- color:black; background-color: white;', 'miniorange-otp-verification' ) . '" 
											value="' . esc_attr( $gf_button_css ) . '" 
											type="text" name="mo_customer_validation_gf_button_css" maxlength="512" pattern="[a-zA-Z0-9:#.,()%\s\-;]+" title="Allowed: letters, digits, spaces, and : ; # . , ( ) % -" >
									</div>
								</div>

							</div>
						</div>';


											multiple_from_select_script_generator( true, true, 'gravity', 'Label', array( $gfcounter1, $gfcounter2, 0 ) );
