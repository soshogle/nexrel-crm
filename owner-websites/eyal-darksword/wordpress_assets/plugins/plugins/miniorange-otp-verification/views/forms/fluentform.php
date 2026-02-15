<?php
/**
 * Load admin view for fluentforms.
 *
 * @package miniorange-otp-verification/views/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;

echo '
        <div class="mo_otp_form" id="' . esc_attr( get_mo_class( $handler ) ) . '">
            <input type="checkbox" ' . esc_attr( $disabled ) . ' id="fluentform_basic" class="app_enable" data-toggle="fluentform_options"
                name="mo_customer_validation_fluentform_enable" value="1" ' . esc_attr( $is_fluentform_enabled ) . ' />
                <strong>' . esc_html( $form_name ) . '</strong>';

echo '<div class="mo_registration_help_desc" id="fluentform_options">
                <b>' . esc_html__( 'Choose between Phone or Email Verification', 'miniorange-otp-verification' ) . '</b>
                <div>
                    <input type="radio" ' . esc_attr( $disabled ) . ' id="wp_form_email" class="app_enable"
                    data-toggle="fluentform_email_option" name="mo_customer_validation_fluentform_enable_type" 
                    value="' . esc_attr( $fluentform_email_type ) . '" ' . ( esc_attr( $fluentform_enabled_type ) === esc_attr( $fluentform_email_type ) ? 'checked' : '' ) . ' />
                    <strong>' . esc_html__( 'Enable Email Verification', 'miniorange-otp-verification' ) . '</strong>
                </div>
                        
                
                <div ' . ( esc_attr( $fluentform_enabled_type ) !== esc_attr( $fluentform_email_type ) ? 'hidden' : '' ) . ' class="mo_registration_help_desc_internal" id="fluentform_email_option">
                    <ol>
                        <li><a href="' . esc_url( $fluentform_form_list ) . '" target="_blank" class="mo_links">' . esc_html__( 'Click Here', 'miniorange-otp-verification' ) . '</a>
                            ' . esc_html__( ' to see your list of forms', 'miniorange-otp-verification' ) . '</li>
                        <li>' . wp_kses( __( 'Click on the <b>Edit</b> option of your fluent form.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
                        <li>' . esc_html__( 'Add an Email Field to your form.', 'miniorange-otp-verification' ) . '</li>
                        <li>' . esc_html__( 'Click on Advance Options and copy the Name attribute.', 'miniorange-otp-verification' ) . '</li>
                        <li>' . esc_html__( 'Enter your Form ID, Email Field Name attribute below', 'miniorange-otp-verification' ) . ':<br>
                            <br/>' . esc_html__( 'Add Form ', 'miniorange-otp-verification' ) . ': <input type="button"  value="+" ' . esc_attr( $disabled ) . '
                            onclick="add_fluentform(\'email\',1);" class="mo-form-button secondary" /><br/><br/>';

							$form_results = get_multiple_form_select( $fluentform_list_of_forms_otp_enabled, false, true, $disabled, 1, 'fluentform', ' Name Attribute' );
							$counter1     = ! MoUtility::is_blank( $form_results['counter'] ) ? max( $form_results['counter'] - 1, 0 ) : 0;

echo '              </ol>
                </div>


                <div>
                    <input type="radio" ' . esc_attr( $disabled ) . ' id="wp_form_phone"
                        class="app_enable" data-toggle="fluentform_phone_option" name="mo_customer_validation_fluentform_enable_type"
                        value="' . esc_attr( $fluentform_phone_type ) . '"' . ( esc_attr( $fluentform_enabled_type ) === esc_attr( $fluentform_phone_type ) ? 'checked' : '' ) . ' />
                    <strong>' . esc_html__( 'Enable Phone Verification', 'miniorange-otp-verification' ) . '</strong>
                </div>

                <div ' . ( esc_attr( $fluentform_enabled_type ) !== esc_attr( $fluentform_phone_type ) ? 'hidden' : '' ) . ' class="mo_registration_help_desc_internal"
                    id="fluentform_phone_option" ' . esc_attr( $disabled ) . '">
                    <ol>
                        <li><a href="' . esc_url( $fluentform_form_list ) . '" target="_blank" class="mo_links">' . esc_html__( 'Click Here', 'miniorange-otp-verification' ) . '</a>
                            ' . esc_html__( ' to see your list of forms', 'miniorange-otp-verification' ) . '</li>
                        <li>' . wp_kses( __( 'Click on the <b>Edit</b> option of your fluent form.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
                        <li>' . esc_html__( 'Add a Phone Field to your form.', 'miniorange-otp-verification' ) . '</li>
                        <li>' . esc_html__( 'Click on Advance Options and copy the Name attribute.', 'miniorange-otp-verification' ) . '</li>
                        <li>' . esc_html__( 'Enter your Form ID, Phone Field Name attribute below', 'miniorange-otp-verification' ) . ':<br>
                            <br/>' . esc_html__( 'Add Form ', 'miniorange-otp-verification' ) . ': <input type="button"  value="+" ' . esc_attr( $disabled ) . ' onclick="add_fluentform(\'phone\',2);
                                " class="mo-form-button secondary" /><br/><br/>';

								$form_results = get_multiple_form_select( $fluentform_list_of_forms_otp_enabled, false, true, $disabled, 2, 'fluentform', ' Name Attribute' );
								$counter2     = ! MoUtility::is_blank( $form_results['counter'] ) ? max( $form_results['counter'] - 1, 0 ) : 0;
echo '</ol>
                    </div>               
                </div>
        </div>';

		multiple_from_select_script_generator( false, true, 'fluentform', ' Name Attribute', array( $counter1, $counter2, 0 ) );
