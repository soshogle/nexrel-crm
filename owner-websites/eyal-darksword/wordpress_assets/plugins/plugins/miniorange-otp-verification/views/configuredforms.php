<?php
/**
 * Load admin view for Configured Forms.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

echo '      <div class="mo_registration_table_layout mo-form-list-container px-mo-4"' . ( $show_configured_forms ? '' : ' hidden' ) . ' id="configured_forms">
                <div class="w-full">
                    <div class="w-full flex gap-mo-32 p-mo-4">
                        <p class="text-lg flex-1 font-medium pr-mo-44 my-mo-1">
                            ' . esc_html__( 'Configured Forms', 'miniorange-otp-verification' ) . '
                        </p>
                        <div class=" flex gap-mo-4 flex-2 pl-mo-8">
                            <a class="mo-button medium secondary" 
                                href="' . esc_url( $forms_list_page ) . '">
                                ' . esc_html__( 'Show Forms List', 'miniorange-otp-verification' ) . '
                            </a>
                            <input  name="save" id="ov_settings_button_config" 
                                class="mo-button medium inverted" ' . esc_attr( $disabled ) . ' 
                                    value="' . esc_attr__( 'Save Settings', 'miniorange-otp-verification' ) . '" type="submit" />
                        </div>
                    </div>
                </div>
                <div id="configured_mo_forms">';
					show_configured_form_details( $controller, $disabled );
echo '			
                </div>
            </div>';
