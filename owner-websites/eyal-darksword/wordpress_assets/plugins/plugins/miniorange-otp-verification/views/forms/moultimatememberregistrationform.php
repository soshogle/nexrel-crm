<?php
/**
 * Load admin view for Ultimate Member Registration form.
 *
 * @package miniorange-otp-verification/views/forms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoMessages;

echo '		<div class="mo_otp_form" id="' . esc_attr( get_mo_class( $handler ) ) . '">
		        <input  type="checkbox" ' . esc_attr( $disabled ) . ' 
		                id="um_default" 
		                data-toggle="um_default_options" 
		                class="app_enable" 
		                name="mo_customer_validation_um_default_enable" 
		                value="1"
					    ' . esc_attr( $um_enabled ) . ' /><strong>' . esc_html( $form_name ) . '</strong>';

echo '		<div class="mo_registration_help_desc" id="um_default_options">
				<b>' . esc_html__( 'Choose between Phone or Email Verification', 'miniorange-otp-verification' ) . '</b>
				
				<div>
                    <input  type ="checkbox" 
                            ' . esc_attr( $disabled ) . ' 
                            id ="um_mo_view" 
                            data-toggle = "um_mo_ajax_view_option" 
                            class="app_enable" 
                            name = "mo_customer_validation_um_is_ajax_form" 
                            value= "1"
                            ' . esc_attr( $is_ajax_mode_enabled ) . '/>
                    <Strong>' . esc_html__( 'Do not show a popup. Validate user on the form itself.', 'miniorange-otp-verification' ) . '</strong>
                    
                    <!--------------------------------------------------------------------------------------------
                                                           UM AJAX OPTIONS
                    --------------------------------------------------------------------------------------------->
                    <div  ' . ( esc_attr( $is_ajax_form ) ? '' : ' style="display:none"' ) . ' 
                           id="um_mo_ajax_view_option" 
                           class="mo_registration_help_desc_internal">
                        <div class="mo_otp_note" style="color:red">
                            ' . esc_html__(
						'This mode does not work with Let the user choose option. Please use either phone or email only.',
						'miniorange-otp-verification'
					) . '
                        </div>   
                        ' . esc_html__( 'You will need to add a verification field on your form, for users to enter their OTP.', 'miniorange-otp-verification' ) . '
                        <ol>
							<li>
							    <a href="' . esc_url( $um_forms ) . '"  target="_blank" rel="noopener noreferrer" class="mo_links">' .
									esc_html__( 'Click Here', 'miniorange-otp-verification' ) .
								'</a> ' . esc_html__( ' to see your list of forms', 'miniorange-otp-verification' ) . '
							</li>
							<li>' . wp_kses( __( 'Click on the <b>Edit link</b> of your form.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
							<li>
							    ' . wp_kses( __( 'Add a new <b>OTP Verification</b> Field. Note the meta key and enter it below.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '
                            </li>
							<li>' . wp_kses( __( 'Click on <b>update</b> to save your form.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
						</ol>
						<div style="margin-left:2%;">
							<div class="pt-mo-4">
								<div class="mo-input-wrapper">
									<label class="mo-input-label">' . esc_html__( 'Verification Field Meta Key', 'miniorange-otp-verification' ) . '</label>
									<input class=" mo-form-input" 
										placeholder="' . esc_attr__( 'Enter the verification field meta key', 'miniorange-otp-verification' ) . '" 
										value="' . esc_attr( $um_otp_meta_key ) . '" 
										type="text" name="mo_customer_validation_um_verify_meta_key" >
								</div>
							</div>				
                        </div>
                        <div style="margin-left:2%;">
							<div class="pt-mo-4">
								<div class="mo-input-wrapper">
									<label class="mo-input-label">' . esc_html__( 'Verification Button text', 'miniorange-otp-verification' ) . '</label>
									<input class=" mo-form-input" 
										placeholder="' . esc_attr__( 'Enter the verification button text', 'miniorange-otp-verification' ) . '" 
										value="' . esc_attr( $um_button_text ) . '" 
										type="text" name="mo_customer_validation_um_button_text" >
								</div>
							</div>	
                        </div>
                    </div>
			    </div>
			    
				<div>
					<input  type="radio" ' . esc_attr( $disabled ) . ' 
					        id="um_phone" 
					        data-toggle="um_phone_instructions" 
					        class="app_enable" 
					        name="mo_customer_validation_um_enable_type" 
					        value="' . esc_attr( $um_type_phone ) . '"
					        ' . ( esc_attr( $um_enabled_type ) === esc_attr( $um_type_phone ) ? 'checked' : '' ) . '/>
				    <strong>' . esc_html__( 'Enable Phone Verification', 'miniorange-otp-verification' ) . '</strong>
				</div>	
					
					<div ' . ( esc_attr( $um_enabled_type ) !== esc_attr( $um_type_phone ) ? ' style="display:none"' : '' ) . ' 
					     id="um_phone_instructions" 
					     class="mo_registration_help_desc_internal">
						 ' . esc_html__( 'Follow the following steps to enable Phone Verification', 'miniorange-otp-verification' ) . ':
						<ol>
							<li>
							    <a href="' . esc_url( $um_forms ) . '" target="_blank" rel="noopener noreferrer" class="mo_links">' .
									esc_html__( 'Click Here', 'miniorange-otp-verification' ) . '
							    </a> ' . esc_html__( ' to see your list of forms', 'miniorange-otp-verification' ) . '
							</li>
							<li>' . wp_kses( __( 'Click on the <b>Edit link</b> of your form.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
							<li>' . wp_kses( __( 'Add a new <b>Mobile Number</b> Field from the list of predefined fields.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
							<li>' . esc_html__( 'Enter the phone User Meta Key.', 'miniorange-otp-verification' ) . '
							<div class="flex gap-mo-4 mt-mo-4">
								<div>
									<div class="mo-input-wrapper">
										<label class="mo-input-label">' . esc_html__( 'Phone User Meta Key', 'miniorange-otp-verification' ) . '</label>
										<input class=" mo-input" id="mo_customer_validation_um_phone_key_1_0" placeholder="' . esc_attr__( 'Enter the phone User Meta Key', 'miniorange-otp-verification' ) . '" value="' . esc_attr( $um_register_field_key ) . '" type="text" name="mo_customer_validation_um_phone_key" >
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
							<div class="mo_otp_note" style="margin-top:1%; width: 70%;">' . esc_html__( "If you don't know the metaKey against which the phone number is stored for all your users then put the default value as phone.", 'miniorange-otp-verification' ) . ' </div>
						</li> 
							
						</ol>
							<input  type="checkbox" ' . esc_attr( $disabled ) . ' 
							        name="mo_customer_validation_um_restrict_duplicates" 
							        value="1" ' . esc_attr( $um_restrict_duplicates ) . '/>
							 <strong>' . esc_html__( 'Do not allow users to use the same phone number for multiple accounts.', 'miniorange-otp-verification' ) . '</strong>
						
				        
					</div>
				
				<div>
					<input  type="radio" ' . esc_attr( $disabled ) . ' 
					        id="um_email" 
					        class="app_enable" 
					        name="mo_customer_validation_um_enable_type" 
					        value="' . esc_attr( $um_type_email ) . '"
					        ' . ( esc_attr( $um_enabled_type ) === esc_attr( $um_type_email ) ? 'checked' : '' ) . ' />
				    <strong>' . esc_html__( 'Enable Email Verification', 'miniorange-otp-verification' ) . '</strong>
				</div>
				
				<div>
					<input  type="radio" ' . esc_attr( $disabled ) . ' 
					        id="um_both" 
					        data-toggle="um_both_instructions" 
					        class="app_enable" 
					        name="mo_customer_validation_um_enable_type" 
					        value="' . esc_attr( $um_type_both ) . '"
						    ' . ( esc_attr( $um_enabled_type ) === esc_attr( $um_type_both ) ? 'checked' : '' ) . ' />
				    <strong>' . esc_html__( 'Let the user choose', 'miniorange-otp-verification' ) . '</strong>';

									echo '				
                    <div ' . ( esc_attr( $um_enabled_type ) !== esc_attr( $um_type_both ) ? ' style="display:none"' : '' ) . ' 
                        id="um_both_instructions" 
                        class="mo_registration_help_desc_internal">
						' . esc_html__( 'Follow the following steps to enable Email and Phone Verification', 'miniorange-otp-verification' ) . ':
						<ol>
							<li>
							    <a href="' . esc_url( $um_forms ) . '" target="_blank" rel="noopener noreferrer" class="mo_links">' .
									esc_html__( 'Click Here', 'miniorange-otp-verification' ) . '
							    </a> ' . esc_html__( ' to see your list of forms', 'miniorange-otp-verification' ) . '
							</li>
							<li>' . wp_kses( __( 'Click on the <b>Edit link</b> of your form.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
							<li>' . wp_kses( __( 'Add a new <b>Mobile Number</b> Field from the list of predefined fields.', 'miniorange-otp-verification' ), array( 'b' => array() ) ) . '</li>
							<li>' . esc_html__( 'Enter the phone User Meta Key.', 'miniorange-otp-verification' ) . '
							<div class="flex gap-mo-4 mt-mo-4">
								<div>
									<div class="mo-input-wrapper">
										<label class="mo-input-label">' . esc_html__( 'Phone User Meta Key', 'miniorange-otp-verification' ) . '</label>
										<input class=" mo-input" id="mo_customer_validation_um_phone_key_3_0" placeholder="' . esc_attr__( 'Enter the phone User Meta Key', 'miniorange-otp-verification' ) . '" value="' . esc_attr( $um_register_field_key ) . '" type="text" name="mo_customer_validation_um_phone_key" >
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
							<div class="mo_otp_note" style="margin-top:1%; width: 70%;">' . esc_html__( "If you don't know the metaKey against which the phone number is stored for all your users then put the default value as phone.", 'miniorange-otp-verification' ) . ' </div>
						</li> 
						</ol>
						<input  type="checkbox" ' . esc_attr( $disabled ) . ' 
						        name="mo_customer_validation_um_restrict_duplicates" 
						        value="1" ' . esc_attr( $um_restrict_duplicates ) . '/>
						<strong>' . esc_html__( 'Do not allow users to use the same phone number for multiple accounts.', 'miniorange-otp-verification' ) . '</strong>
					</div>
				</div>
			</div>
		</div>';
