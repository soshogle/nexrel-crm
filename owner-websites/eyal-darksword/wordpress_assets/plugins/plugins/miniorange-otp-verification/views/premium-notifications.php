<?php
/**
 * Load admin view for Premium Notifications Subtab.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;

echo '<div id="' . esc_attr( $premium_notif_id ) . '" class="mo-subpage-container ' . esc_attr( $premium_notif_hidden ) . '">
        <div class="pb-mo-2 px-mo-8">
            <div class="mo_otp_note flex gap-mo-1 my-mo-4">
                <svg width="18" class="my-mo-4 ml-mo-4" height="18" viewBox="0 0 24 24" fill="none">
                        <g id="d4a43e0162b45f718f49244b403ea8f4">
                            <g id="4ea4c3dca364b4cff4fba75ac98abb38">
                                <g id="2413972edc07f152c2356073861cb269">
                                    <path id="2deabe5f8681ff270d3f37797985a977" d="M20.8007 20.5644H3.19925C2.94954 20.5644 2.73449 20.3887 2.68487 20.144L0.194867 7.94109C0.153118 7.73681 0.236091 7.52728 0.406503 7.40702C0.576651 7.28649 0.801941 7.27862 0.980492 7.38627L7.69847 11.4354L11.5297 3.72677C11.6177 3.54979 11.7978 3.43688 11.9955 3.43531C12.1817 3.43452 12.3749 3.54323 12.466 3.71889L16.4244 11.3598L23.0197 7.38654C23.1985 7.27888 23.4233 7.28702 23.5937 7.40728C23.7641 7.52754 23.8471 7.73707 23.8056 7.94136L21.3156 20.1443C21.2652 20.3887 21.0501 20.5644 20.8007 20.5644Z" fill="orange"></path>
                                </g>
                            </g>
                        </g>
                    </svg>
                    <div class="my-mo-5 mr-mo-4">' . wp_kses( $notif_subtab['discription'], MoUtility::mo_allow_html_array() ) . '
                </div>
            </div>
        </div>
    </div>';
