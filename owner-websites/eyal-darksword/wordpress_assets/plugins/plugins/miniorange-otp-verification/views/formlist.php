<?php
/**
 * Load admin view for header of forms.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Helper\MoConstants;
use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;

echo '			<div class="mo-form-list-container"	id="form_search" style = "' . esc_attr( $form_name ? 'display:none;' : '' ) . '">
					<div class="w-full flex gap-mo-8 px-mo-8 pt-mo-4">
								<p class="text-lg flex-1 font-medium pr-mo-44 py-mo-1">
								    ' . esc_html( __( 'Select Your Form From The List Below', 'miniorange-otp-verification' ) ) . ':</p>';
echo '							<div class="flex flex-2 gap-mo-8">
									<span>
							            <a  class="mo-button medium secondary" 
                                            href="' . esc_url( $moaction ) . '">
                                            ' . esc_html( __( 'Active Forms', 'miniorange-otp-verification' ) ) . '
                                        </a>
                                    </span>
									<span>
							            <a  class="mo-button medium inverted"  target = "_blank" rel="noopener noreferrer"
                                            href="' . esc_url( 'https://plugins.miniorange.com/step-by-step-guide-for-wordpress-otp-verification' ) . '">
                                            ' . esc_html( __( 'Plugin Set up guide', 'miniorange-otp-verification' ) ) . '
                                        </a>
                                    </span>
								</div>    
							</div>';
echo '                     	
							<div class="py-mo-4 px-mo-8 text-mo-lg"><b>' . esc_html( MoMessages::showMessage( MoMessages::FORM_NOT_FOUND ) ) . '</b>';
echo '                          	<span class="tooltip">
									<span class="dashicons dashicons-editor-help"></span>
									<span class="tooltiptext">
										<span class="header"><b><i>' . esc_html( MoMessages::showMessage( MoMessages::FORM_NOT_AVAIL_HEAD ) ) . '</i></b></span><br/><br/>
										<span class="body">' . wp_kses( MoMessages::showMessage( MoMessages::FORM_NOT_AVAIL_BODY ), MoUtility::mo_allow_html_array() ) . '</span>

										</span>
								</span>
							</div>';
							get_otp_verification_form_dropdown();
echo '
				</div>';
