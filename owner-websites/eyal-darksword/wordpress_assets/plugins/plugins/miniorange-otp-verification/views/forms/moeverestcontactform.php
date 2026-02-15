<?php
/**
 * Load admin view for Buddy Press Registyration form.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;

echo '
        <div class="mo_otp_form" id="' . esc_attr( get_mo_class( $handler ) ) . '">
            <input type="checkbox" ' . esc_attr( $disabled ) . ' id="everest_contact_basic" class="app_enable" data-toggle="everest_contact_options"
                name="mo_customer_validation_everest_contact_enable" value="1" ' . esc_attr( $is_everest_contact_enabled ) . ' />
                <strong>' . esc_html( $form_name ) . '</strong>
            <div class="mo_registration_help_desc" id="everest_contact_options">
                <b>' . esc_html__( 'Choose between Phone or Email Verification', 'miniorange-otp-verification' ) . '</b>
                <div>
                    <input type="radio" ' . esc_attr( $disabled ) . ' id="everest_contact_form_email" class="app_enable"
                    data-toggle="everest_contact_email_option" name="mo_customer_validation_everest_contact_enable_type"
                    value="' . esc_attr( $everest_contact_email_type ) . '" ' . ( esc_attr( $everest_contact_enabled_type ) === esc_attr( $everest_contact_email_type ) ? 'checked' : '' ) . ' />
                    <strong>' . esc_html__( 'Enable Email Verification', 'miniorange-otp-verification' ) . '</strong>
                </div>


                <div ' . ( esc_attr( $everest_contact_enabled_type ) !== esc_attr( $everest_contact_email_type ) ? 'hidden' : '' ) . ' class="mo_registration_help_desc_internal" id="everest_contact_email_option">
                    <ol>
                        <li><a href="' . esc_url( $everest_contact_form_list ) . '" target="_blank" rel="noopener noreferrer" class="mo_links">' . esc_html__( 'Click Here', 'miniorange-otp-verification' ) . '</a>
                            ' . esc_html__( ' to see your list of forms', 'miniorange-otp-verification' ) . '</li>
                        <li>' . wp_kses( __( 'Click on the <b>Edit</b> option of your Everest Contact Form.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
                        <li>' . esc_html__( 'Note the Form ID from the Form Settings Page.', 'miniorange-otp-verification' ) . '</li>
                        <li>' . esc_html__( 'Add an Email Field to your form. Note the Field ID of the Email field.', 'miniorange-otp-verification' ) . '</li>
                        <li>' . esc_html__( 'Add a Verification Field to your form where users will enter the OTP sent to their Email Address. Note the Field ID of the Verification field.', 'miniorange-otp-verification' ) . '</li>
                        <li>' . esc_html__( 'Make sure Both Email Field and Verification Field are required Fields.', 'miniorange-otp-verification' ) . '</li>
                        <li>' . esc_html__( 'Enter your Form ID, Email Field ID and Verification Field ID below', 'miniorange-otp-verification' ) . ':<br>
                            <br/>' . esc_html__( 'Add Form ', 'miniorange-otp-verification' ) . ': <input type="button"  value="+" ' . esc_attr( $disabled ) . '
                            onclick="add_everest_contact(\'email\',1);" class="mo-form-button secondary" /><br/><br/>';

						$form_results = get_multiple_form_select( $everest_contact_list_of_forms_otp_enabled, true, true, $disabled, 1, 'everest_contact', 'ID' );
						$counter1     = ! MoUtility::is_blank( $form_results['counter'] ) ? max( $form_results['counter'] - 1, 0 ) : 0;
echo '              </ol>
                </div>


                <div>
                    <input type="radio" ' . esc_attr( $disabled ) . ' id="everest_contact_form_phone"
                        class="app_enable" data-toggle="everest_contact_phone_option" name="mo_customer_validation_everest_contact_enable_type"
                        value="' . esc_attr( $everest_contact_phone_type ) . '"' . ( esc_attr( $everest_contact_enabled_type ) === esc_attr( $everest_contact_phone_type ) ? 'checked' : '' ) . ' />
                    <strong>' . esc_html__( 'Enable Phone Verification', 'miniorange-otp-verification' ) . '</strong>
                </div>

                <div ' . ( esc_attr( $everest_contact_enabled_type ) !== esc_attr( $everest_contact_phone_type ) ? 'hidden' : '' ) . ' class="mo_registration_help_desc_internal"
                    id="everest_contact_phone_option" ' . esc_attr( $disabled ) . '">
                    <ol>
                        <li><a href="' . esc_url( $everest_contact_form_list ) . '" target="_blank" class="mo_links">' . esc_html__( 'Click Here', 'miniorange-otp-verification' ) . '</a>
                            ' . esc_html__( ' to see your list of forms', 'miniorange-otp-verification' ) . '</li>
                        <li>' . wp_kses( __( 'Click on the <b>Edit</b> option of your Everest Contact Form.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
                        <li>' . esc_html__( 'Note the Form ID from the Form Settings Page.', 'miniorange-otp-verification' ) . '</li>
                        <li>' . wp_kses( __( 'Add a <b>Phone Number</b> field to your form. Note the Field ID of the Phone field.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
                        <li>' . wp_kses( __( 'Make sure the <b>country code dropdown</b> of the Everest Contact Form plugin is disabled.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
                        <li>' . esc_html__( 'Make sure the format of Phone Field is default.', 'miniorange-otp-verification' ) . '</li>
                        <li>' . esc_html__( 'Add a Verification Field to your form where users will enter the OTP sent to their Phone. Note the Field ID of the Verification field.', 'miniorange-otp-verification' ) . '</li>
                        <li>' . esc_html__( 'Make sure Both Phone Field and Verification Field are required Fields.', 'miniorange-otp-verification' ) . '</li>
                        <li>' . esc_html__( 'Enter your Form ID, Phone Field ID and Verification Field ID below', 'miniorange-otp-verification' ) . ':<br>
                            <br/>' . esc_html__( 'Add Form ', 'miniorange-otp-verification' ) . ': <input type="button"  value="+" ' . esc_attr( $disabled ) . ' onclick="add_everest_contact(\'phone\',2);
                                " class="mo-form-button secondary" /><br/><br/>';

								$form_results = get_multiple_form_select( $everest_contact_list_of_forms_otp_enabled, true, true, $disabled, 2, 'everest_contact', 'ID' );
								$counter2     = ! MoUtility::is_blank( $form_results['counter'] ) ? max( $form_results['counter'] - 1, 0 ) : 0;
echo '</ol>
                    </div>
                    <div class="pt-mo-4">
                        <div class="mo-input-wrapper">
                            <label class="mo-input-label">' . esc_html__( 'Verification Button text', 'miniorange-otp-verification' ) . '</label>
                            <input class=" mo-form-input w-[40%]" placeholder="Enter the verification button text" value="' . esc_attr( $button_text ) . '" type="text" name="mo_customer_validation_everest_contact_button_text" >
                        </div>
                    </div>
                </div>
        </div>';

		multiple_from_select_script_generator( true, true, 'everest_contact', 'ID', array( $counter1, $counter2, 0 ) );
