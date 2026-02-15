<?php
/**
 * Load admin view for subtabs.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

if ( isset( $sub_tab_details->sub_tab_details[ $active_tab ] ) ) {
	$sub_tab_list = $sub_tab_details->sub_tab_details[ $active_tab ];
	echo '	<div id="subtab" class="mo-subtabs-container">';

	foreach ( $sub_tab_list as $sub_tabs ) {
		if ( $sub_tabs->show_in_nav ) {
			echo '
                    <div class="mo-subtab-item">
                        <span class="mo-subtab-title" 
                            id="' . esc_attr( $sub_tabs->id ) . '">
                            ' . esc_html( $sub_tabs->tab_name ) . '
                        </span>
                    </div>';
		}
	}
	echo '</div>';
}
