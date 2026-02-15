<?php
/**
 * Load admin view for Ninja form.
 *
 * @package miniorange-otp-verification/views/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;


echo '	<div class="mo_otp_form" id="' . esc_attr( get_mo_class( $handler ) ) . '"><input type="checkbox" ' . esc_attr( $disabled ) . ' id="ninja_form" class="app_enable" data-toggle="ninja_ajax_form_options" name="mo_customer_validation_nja_enable" value="1"
										' . esc_attr( $ninja_ajax_form_enabled ) . ' /><strong>' . esc_html( $form_name ) . '</strong>';

echo '							<div class="mo_registration_help_desc" id="ninja_ajax_form_options">
									<div><input type="radio" ' . esc_attr( $disabled ) . ' id="ninja_ajax_form_email" class="app_enable" data-toggle="nfae_instructions" name="mo_customer_validation_nja_enable_type" value="' . esc_attr( $ninja_ajax_form_type_email ) . '"
										' . ( esc_attr( $ninja_ajax_form_enabled_type ) === esc_attr( $ninja_ajax_form_type_email ) ? 'checked' : '' ) . ' />
										<strong>' . esc_html__( 'Enable Email Verification', 'miniorange-otp-verification' ) . '</strong>
									</div>
									<div ' . ( esc_attr( $ninja_ajax_form_enabled_type ) !== esc_attr( $ninja_ajax_form_type_email ) ? ' style="display:none"' : '' ) . ' class="mo_registration_help_desc_internal" id="nfae_instructions" >
											' . esc_html__( 'Follow the following steps to enable Email Verification for', 'miniorange-otp-verification' ) . ' Ninja Form:
											<ol>
												<li><a href="' . esc_url( $ninja_ajax_form_list ) . '" target="_blank" rel="noopener noreferrer" class="mo_links">' . esc_html__( 'Click Here', 'miniorange-otp-verification' ) . '</a> ' . esc_html__( ' to see your list of forms', 'miniorange-otp-verification' ) . '</li>
												<li>' . wp_kses( __( 'Click on the <b>Edit</b> option of your ninja form.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
												<li>' . wp_kses( __( 'Add an Email Field to your form. Note the Field Key of the email field. You will need to enable <b>Dev Mode</b> for this.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
												<li>' . esc_html__( 'Add an Verification Field to your form where users will enter the OTP received. Note the Field Key of the verification field.', 'miniorange-otp-verification' ) . '</li>
												<li>' . wp_kses( __( 'Please set the Verification Field as <b>required</b>.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
												<li>' . esc_html__( 'Select your Form ID, the Email Field Key and the Verification Field Key below', 'miniorange-otp-verification' ) . ':<br>
													<br/>' . esc_html__( 'Add Form ', 'miniorange-otp-verification' ) . ': <input type="button"  value="+" ' . esc_attr( $disabled ) . ' onclick="add_ninja_ajax(\'email\',1);" class="mo-form-button secondary" /><br/><br/>';

													$form_results = get_multiple_form_select( $ninja_ajax_form_otp_enabled, true, true, $disabled, 1, 'ninja_ajax', 'Key' );
													$counter1     = ! MoUtility::is_blank( $form_results['counter'] ) ? max( $form_results['counter'] - 1, 0 ) : 0;

echo '											</li>
												<li>' . esc_html__( 'Click on the Save Button to save your settings', 'miniorange-otp-verification' ) . '</li>
											</ol>
									</div>
									<div><input type="radio" ' . esc_attr( $disabled ) . ' id="ninja_ajax_form_phone" class="app_enable" data-toggle="nfap_instructions" name="mo_customer_validation_nja_enable_type" value="' . esc_attr( $ninja_ajax_form_type_phone ) . '"
										' . ( esc_attr( $ninja_ajax_form_enabled_type ) === esc_attr( $ninja_ajax_form_type_phone ) ? 'checked' : '' ) . ' />
										<strong>' . esc_html__( 'Enable Phone Verification', 'miniorange-otp-verification' ) . '</strong>
									</div>
									<div ' . ( esc_attr( $ninja_ajax_form_enabled_type ) !== esc_attr( $ninja_ajax_form_type_phone ) ? ' style="display:none"' : '' ) . ' class="mo_registration_help_desc_internal" id="nfap_instructions" >
											' . esc_html__( 'Follow the following steps to enable Phone Verification for Ninja Form', 'miniorange-otp-verification' ) . ':
											<ol>
												<li><a href="' . esc_url( $ninja_ajax_form_list ) . '" target="_blank" rel="noopener noreferrer" class="mo_links">' . esc_html__( 'Click Here', 'miniorange-otp-verification' ) . '</a> ' . esc_html__( ' to see your list of forms', 'miniorange-otp-verification' ) . '</li>
												<li>' . wp_kses( __( 'Click on the <b>Edit</b> option of your ninja form.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
												<li>' . esc_html__( 'Add an Phone Field to your form. Note the Field Key of the phone field. You will need to enable Dev Mode for this.', 'miniorange-otp-verification' ) . '</li>
												<li>' . esc_html__( 'Make sure you have set the Input Mask type to None for the phone field.', 'miniorange-otp-verification' ) . '</li>
												<li>' . esc_html__( 'Add an Verification Field to your form where users will enter the OTP received. Note the Field Key of the verification field.', 'miniorange-otp-verification' ) . '</li>
												<li>' . wp_kses( __( 'Please set the Verification Field and Phone Field as <b>required</b>.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
												<li>' . esc_html__( 'Select your Form ID, the Phone Field Key and the Verification Field Key below', 'miniorange-otp-verification' ) . ':<br>
													<br/>' . esc_html__( 'Add Form ', 'miniorange-otp-verification' ) . ': <input type="button"  value="+" ' . esc_attr( $disabled ) . ' onclick="add_ninja_ajax(\'phone\',2);" class="mo-form-button secondary" /><br/><br/>';

													$form_results = get_multiple_form_select( $ninja_ajax_form_otp_enabled, true, true, $disabled, 2, 'ninja_ajax', 'Key' );
													$counter2     = ! MoUtility::is_blank( $form_results['counter'] ) ? max( $form_results['counter'] - 1, 0 ) : 0;
echo '											</li>
												<li>' . esc_html__( 'Click on the Save Button to save your settings', 'miniorange-otp-verification' ) . '</li>
											</ol>
									</div>
									<div style="margin-left:2%;">
										<div class="pt-mo-4">
											<div class="mo-input-wrapper">
												<label class="mo-input-label">' . esc_html__( 'Verification Button text', 'miniorange-otp-verification' ) . '</label>
												<input class=" mo-form-input" 
													placeholder="' . esc_attr__( 'Enter the verification button text', 'miniorange-otp-verification' ) . '" 
													value="' . esc_attr( $button_text ) . '" 
													type="text" name="mo_customer_validation_nja_button_text" >
											</div>
										</div>
                                    </div>
								</div>
							</div>';

							multiple_from_select_script_generator( true, true, 'ninja_ajax', 'Key', array( $counter1, $counter2, 0 ) );
