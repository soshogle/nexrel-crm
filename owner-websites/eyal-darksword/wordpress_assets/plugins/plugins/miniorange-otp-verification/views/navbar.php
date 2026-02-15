<?php
/**
 * Load admin view for Navbars.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Handler\MoActionHandlerHandler;

echo '	<div id="tab" class="mo-sidenav-container">';

foreach ( $tab_details->tab_details as $motabs ) {
	if ( $motabs->show_in_nav ) {
		echo '<a  class="mo-sidenav-item 
                        ' . ( $active_tab === $motabs->menu_slug ? 'mo-sidenav-item-active' : '' ) . '" 
                        href="' . esc_url( $motabs->url ) . '"
                        id="' . esc_attr( $motabs->id ) . '">
                        <span class="mo-active-tab-indicator ' . ( $active_tab === $motabs->menu_slug ? 'inline-flex' : 'hidden' ) . '"></span>
                        <!-- Tab Icon -->
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          class="w-mo-icon h-mo-icon"
                        >
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="' . esc_attr( $motabs->icon ) . '"
                            fill="#1E1E1E"
                          />
                        </svg>

                        <!-- Tab Title -->
                        ' . esc_html( $motabs->tab_name ) . '
                    </a>';
	}
}
echo '
                <div class="flex flex-col gap-mo-2 justify-center pl-mo-1.5">
                    <hr>
                    <a class="mo-sidenav-item text-center" id="LicensingPlanButton" href="' . esc_url( $license_url ) . '">
                        ' . esc_html( __( 'Licensing Plans', 'miniorange-otp-verification' ) ) . '
                    </a>
                    <a class="mo-sidenav-item text-center" id="faqButton" href="' . esc_url( $help_url ) . '" target="_blank" rel="noopener noreferrer">
                        ' . esc_html( __( 'FAQs', 'miniorange-otp-verification' ) ) . '
                    </a>
                    <a class="mo-sidenav-item text-center" style="cursor:pointer;" onClick="otpSupportOnClick(\'Hi! I am interested in using your plugin and would like to get a demo of the features and functionality. Please schedule a demo for the plugin. \');" id="demoButton">
                        ' . esc_html( __( 'Need a Demo?', 'miniorange-otp-verification' ) ) . '
                    </a>
                </div>
        </div>';
