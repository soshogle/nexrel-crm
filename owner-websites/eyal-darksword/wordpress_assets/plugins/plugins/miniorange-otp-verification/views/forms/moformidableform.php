<?php
/**
 * Load admin view for formidable form.
 *
 * @package miniorange-otp-verification/views/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;

echo '	<div class="mo_otp_form" id="' . esc_attr( get_mo_class( $handler ) ) . '">
	        <input  type="checkbox" ' . esc_attr( $disabled ) . '
	                id="frm_form" 
	                class="app_enable" 
	                data-toggle="frm_form_options" 
	                name="mo_customer_validation_frm_form_enable" 
	                value="1"' . esc_attr( $frm_form_enabled ) . ' />
	        <strong>' . esc_html( $form_name ) . '</strong>';


echo '		<div class="mo_registration_help_desc"
                 id="frm_form_options">
                <div>
                    <input  type="radio" ' . esc_attr( $disabled ) . '
                            id="frm_form_email" 
                            class="app_enable" 
                            data-toggle="nfe_instructions" 
                            name="mo_customer_validation_frm_form_enable_type" 
                            value="' . esc_attr( $frm_form_type_email ) . '"
                            ' . ( esc_attr( $frm_form_enabled_type ) === esc_attr( $frm_form_type_email ) ? 'checked' : '' ) . ' />
                    <strong>' . esc_html__( 'Enable Email Verification', 'miniorange-otp-verification' ) . '</strong>
                </div>
                <div    ' . ( esc_attr( $frm_form_enabled_type ) !== esc_attr( $frm_form_type_email ) ? 'hidden' : '' ) . '
                        class="mo_registration_help_desc_internal" 
                        id="nfe_instructions" >
                        ' . esc_html__( 'Follow the following steps to enable Email Verification for Formidable Form', 'miniorange-otp-verification' ) . ':
                        <ol>
                            <li>
                                <a href="' . esc_url( $frm_form_list ) . '" target="_blank" class="mo_links">' .
								esc_html__( 'Click Here', 'miniorange-otp-verification' ) .
								'</a> ' . esc_html__( ' to see your list of forms', 'miniorange-otp-verification' ) . '
                            </li>
                            <li>' . wp_kses( __( 'Note the ID of the form and Click on the <b>Edit</b> option of your Formidable form.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
                            <li>' . esc_html__( 'Add an Email Field to your form. Note the Field Settings ID of the email field.', 'miniorange-otp-verification' ) . '</li>
                            <li>' .
									esc_html__( 'Add another Text Field to your form for Entering OTP. Note the Field Settings ID of the OTP Verification field.', 'miniorange-otp-verification' ) .

							'</li>
                            <li>' . esc_html__( 'Make both Email Field and Verification Field Required.', 'miniorange-otp-verification' ) . '</li>
                            <li>' . esc_html__( 'Enter your Form ID, Email Field ID and Verification Field ID below', 'miniorange-otp-verification' ) . ':
                                    <br><br/>' . esc_html__( 'Add Form ', 'miniorange-otp-verification' ) . ':
                                    <input  type="button"  
                                            value="+" ' . esc_attr( $disabled ) . '
                                            onclick="add_frm(\'email\',1);" 
                                            class="mo-form-button secondary" />
                                    <br/><br/>';

									$form_results = get_multiple_form_select(
										$frm_form_otp_enabled,
										true,
										true,
										$disabled,
										1,
										'frm',
										'ID'
									);
									$counter1     = ! MoUtility::is_blank( $form_results['counter'] )
												? max( $form_results['counter'] - 1, 0 ) : 0;

									echo '					    </li>
                            <li>' . esc_html__( 'Click on the Save Button to save your settings', 'miniorange-otp-verification' ) . '</li>
                        </ol>
                </div>
                <div>
                    <input  type="radio" ' . esc_attr( $disabled ) . '
                            id="frm_form_phone" 
                            class="app_enable" 
                            data-toggle="nfp_instructions" 
                            name="mo_customer_validation_frm_form_enable_type" 
                            value="' . esc_attr( $frm_form_type_phone ) . '"
                            ' . ( esc_attr( $frm_form_enabled_type ) === esc_attr( $frm_form_type_phone ) ? 'checked' : '' ) . ' />
                    <strong>' . esc_html__( 'Enable Phone Verification', 'miniorange-otp-verification' ) . '</strong>
                </div>
                <div    ' . ( esc_attr( $frm_form_enabled_type ) !== esc_attr( $frm_form_type_phone ) ? 'hidden' : '' ) . '
                        class="mo_registration_help_desc_internal" id="nfp_instructions" >
                        ' . esc_html__( 'Follow the following steps to enable Phone Verification for Formidable Form', 'miniorange-otp-verification' ) . ':
                        <ol>
                            <li>
                                <a href="' . esc_url( $frm_form_list ) . '" target="_blank" class="mo_links">' .
									esc_html__( 'Click Here', 'miniorange-otp-verification' ) .
									'</a> ' .
									esc_html__( ' to see your list of forms', 'miniorange-otp-verification' ) .
									'</li>
                            <li>' . wp_kses( __( 'Note the ID of the form and Click on the <b>Edit</b> option of your Formidable form.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
                            <li>' . esc_html__( 'Add a Phone Field to your form. Note the Field Settings ID of the phone field.', 'miniorange-otp-verification' ) . '</li>
                            <li>' .
									esc_html__( 'Add another Text Field to your form for Entering OTP. Note the Field Settings ID of the OTP Verification field.', 'miniorange-otp-verification' ) . '
                            </li>
                            <li>' . esc_html__( 'Make both Phone Field and Verification Field Required.', 'miniorange-otp-verification' ) . '</li>
                            <li>' . esc_html__( 'Enter your Form ID, Phone Field ID and Verification Field ID below', 'miniorange-otp-verification' ) . ':<br>
                                <br/>' . esc_html__( 'Add Form ', 'miniorange-otp-verification' ) . ':
                                <input  type="button"  
                                        value="+" ' . esc_attr( $disabled ) . '
                                        onclick="add_frm(\'phone\',2);" 
                                        class="mo-form-button secondary" /><br/><br/>';

									$form_results = get_multiple_form_select(
										$frm_form_otp_enabled,
										true,
										true,
										$disabled,
										2,
										'frm',
										'ID'
									);
									$counter2     = ! MoUtility::is_blank( $form_results['counter'] )
											? max( $form_results['counter'] - 1, 0 ) : 0;
									echo '						</li>
                            <li>' . esc_html__( 'Click on the Save Button to save your settings', 'miniorange-otp-verification' ) . '</li>
                        </ol>
                </div>
                <div class="pt-mo-4">
                        <div class="mo-input-wrapper">
                            <label class="mo-input-label">' . esc_html__( 'Verification Button text', 'miniorange-otp-verification' ) . '</label>
                            <input class="mo-form-input" placeholder="Enter the verification button text" value="' . esc_attr( $button_text ) . '" type="text" name="mo_customer_validation_frm_button_text" >
                        </div>
                </div>
            </div>
        </div>';

									multiple_from_select_script_generator(
										true,
										true,
										'frm',
										'ID',
										array( $counter1, $counter2, 0 )
									);
