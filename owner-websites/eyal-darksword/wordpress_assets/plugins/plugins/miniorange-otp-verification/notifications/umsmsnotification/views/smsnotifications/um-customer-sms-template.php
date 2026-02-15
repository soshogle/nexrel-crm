<?php
/**
 * Load admin view for Ultimate Member Customer SMS Notification.
 *
 * @package miniorange-otp-verification/notifications/umsmsnotification/views/smsnotifications
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;

$tags = array();
if ( isset( $sms_settings->available_tags ) && is_string( $sms_settings->available_tags ) ) {
	$sanitized_tags = sanitize_text_field( $sms_settings->available_tags );
	$tags           = explode( ',', $sanitized_tags );
	$tags           = array_filter( array_map( 'trim', $tags ) );
}


$tag_icon = '
	<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
	  <g id="bf4fa8aaae8fcc2cb54e35893d49608b">
	    <path id="9ffbb3f97c90a2ce1b5aa702394519ce" d="M15.712 10.0555C15.2239 10.5437 14.4324 10.5437 13.9442 10.0555L12.8836 11.1162C13.9575 12.1901 15.6987 12.1901 16.7727 11.1162L15.712 10.0555ZM13.9442 10.0555C13.4561 9.56736 13.4561 8.7759 13.9442 8.28775L12.8836 7.22709C11.8096 8.30103 11.8096 10.0422 12.8836 11.1162L13.9442 10.0555ZM13.9442 8.28775C14.4324 7.79959 15.2239 7.79959 15.712 8.28775L16.7727 7.22709C15.6987 6.15315 13.9575 6.15315 12.8836 7.22709L13.9442 8.28775ZM15.712 8.28775C16.2002 8.7759 16.2002 9.56736 15.712 10.0555L16.7727 11.1162C17.8466 10.0422 17.8466 8.30103 16.7727 7.22709L15.712 8.28775Z" fill="#28303F"></path>
	    <path id="6c4af507accafcc987fb6fb2529d5aba" d="M16.5404 3.77844L16.4879 4.52659L16.5404 3.77844ZM20.2218 7.45987L20.97 7.40734H20.97L20.2218 7.45987ZM2.80786 16.9498L2.27753 17.4801L2.80786 16.9498ZM2.84632 11.2545L3.37665 11.7848L2.84632 11.2545ZM7.0505 21.1924L7.58083 20.6621L7.0505 21.1924ZM20.5002 11.4242L19.752 11.4767H19.752L20.5002 11.4242ZM9.41168 4.68911L8.88135 4.15878L9.41168 4.68911ZM12.5761 3.50011L12.6286 2.75196L12.5761 3.50011ZM18.7808 14.0583L12.2155 20.6236L13.2761 21.6843L19.8415 15.1189L18.7808 14.0583ZM7.58083 20.6621L3.33819 16.4195L2.27753 17.4801L6.52017 21.7228L7.58083 20.6621ZM3.37665 11.7848L9.94201 5.21944L8.88135 4.15878L2.31599 10.7241L3.37665 11.7848ZM12.5236 4.24827L16.4879 4.52659L16.5929 3.03028L12.6286 2.75196L12.5236 4.24827ZM19.4737 7.51239L19.752 11.4767L21.2483 11.3717L20.97 7.40734L19.4737 7.51239ZM16.4879 4.52659C18.0945 4.63939 19.3609 5.90574 19.4737 7.51239L20.97 7.40734C20.8049 5.05507 18.9452 3.19542 16.5929 3.03028L16.4879 4.52659ZM3.33819 16.4195C2.07572 15.157 2.07943 13.082 3.37665 11.7848L2.31599 10.7241C0.446537 12.5936 0.41581 15.6184 2.27753 17.4801L3.33819 16.4195ZM12.2155 20.6236C10.9183 21.9209 8.84331 21.9246 7.58083 20.6621L6.52017 21.7228C8.38189 23.5845 11.4067 23.5537 13.2761 21.6843L12.2155 20.6236ZM19.8415 15.1189C20.8306 14.1298 21.3459 12.7618 21.2483 11.3717L19.752 11.4767C19.8189 12.4297 19.4656 13.3736 18.7808 14.0583L19.8415 15.1189ZM9.94201 5.21944C10.6267 4.53473 11.5706 4.18137 12.5236 4.24827L12.6286 2.75196C11.2385 2.65436 9.87047 3.16966 8.88135 4.15878L9.94201 5.21944Z" fill="#28303F"></path>
	  </g>
	</svg>
';

$crown_icon = '
	<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
	  <g id="bf0b82207cbb88244f971b7e2ab180bb" clip-path="url(#clip0_613_134)">
	    <path id="99a55fb1d256c266184dcdf08fb35d37" d="M4.23104 18.3765C4.25442 18.4751 4.29751 18.568 4.3577 18.6495C4.4179 18.731 4.49396 18.7995 4.58131 18.8508C4.66866 18.9021 4.76549 18.9353 4.86599 18.9482C4.96648 18.9612 5.06855 18.9537 5.16606 18.9261C9.63692 17.6917 14.3587 17.6912 18.8297 18.9248C18.9272 18.9523 19.0293 18.9598 19.1297 18.9469C19.2302 18.9339 19.327 18.9008 19.4143 18.8495C19.5016 18.7982 19.5777 18.7298 19.6379 18.6483C19.698 18.5668 19.7411 18.474 19.7646 18.3755L22.1541 8.2208C22.1861 8.08486 22.1795 7.94268 22.1351 7.81029C22.0906 7.67789 22.0101 7.56054 21.9025 7.47145C21.795 7.38235 21.6647 7.32505 21.5264 7.30601C21.388 7.28696 21.2471 7.30692 21.1195 7.36364L16.3772 9.4713C16.206 9.54741 16.0125 9.55665 15.8348 9.49722C15.657 9.43779 15.508 9.31398 15.417 9.15017L12.6559 4.18008C12.5909 4.06316 12.4959 3.96574 12.3806 3.89791C12.2653 3.83008 12.134 3.79431 12.0002 3.79431C11.8665 3.79431 11.7352 3.83008 11.6199 3.89791C11.5046 3.96574 11.4096 4.06316 11.3446 4.18008L8.58346 9.15017C8.49245 9.31398 8.34342 9.43779 8.16571 9.49722C7.988 9.55665 7.79447 9.54741 7.62324 9.4713L2.88029 7.36332C2.75269 7.30661 2.6118 7.28665 2.47347 7.30568C2.33515 7.32471 2.20488 7.38197 2.09734 7.47103C1.98979 7.56008 1.90925 7.67739 1.86476 7.80974C1.82028 7.9421 1.81363 8.08424 1.84555 8.22017L4.23104 18.3765Z" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
	  </g>
	  <defs>
	    <clipPath id="clip0_613_134">
	      <rect width="24" height="24" fill="white"></rect>
	    </clipPath>
	  </defs>
	</svg>
';


echo '				<div>
						<div class="mt-mo-3 flex flex-col gap-mo-6">
						<div class="w-full flex">
								<div class="flex-1">
									<h5 class="mo-title flex items-center gap-mo-2">
										' . esc_html( 'Phone Meta Key' ) . '
									</h5>
									<p class="mo-caption mt-mo-2">Phone MetaKey is the key against which Phone number is stored in the usermeta table.</p>
								</div>
								<div class="flex-1 flex flex-wrap">
									<input type="text" name="' . esc_attr( $recipient_tag ) . '" id="' . esc_attr( $recipient_tag ) . '" value="' . esc_attr( $recipient_value ) . '" class="w-full mo-input" placeholder="' . esc_html( __( 'Enter the meta key of the Phone Number Field.', 'miniorange-otp-verification' ) ) . ');"/>
								   </div>
							</div>
							<div class="w-full flex">
								<div class="flex-1">
									<h5 class="mo-title flex items-center gap-mo-2">
										' . esc_html( MoMessages::showMessage( MoMessages::DLT_TEMPLATE_TITLE ) ) . '
										<span class="tooltip">
											<span class="dashicons dashicons-editor-help"></span>
											<span class="tooltiptext">
												<span class="body">' . wp_kses(
											MoMessages::showMessage( MoMessages::DLT_TEMPLATE_BODY ),
											MoUtility::mo_allow_html_array()
										) . '</span>
											</span>
										</span>
									</h5>
								</div>
							</div>

							<div class="w-full flex">
								<div class="flex-1">
									<h5 class="mo-title">SMS Template</h5>
									<p class="mo-caption mt-mo-2">' . esc_html( $sms_settings->page_description ) . '</p>
								</div>
								<div class="flex-1">
									<textarea id="' . esc_attr( $textarea_tag ) . '" class="mo-textarea mo_remaining_characters w-full h-[128px]"
                                   	name="' . esc_attr( $textarea_tag ) . '" placeholder="' . esc_attr( isset( $sms_settings->default_sms_body ) ? $sms_settings->default_sms_body : '' ) . '">' . esc_textarea( isset( $sms_settings->sms_body ) ? $sms_settings->sms_body : '' ) . '</textarea>
									<span id="characters" class="flex-1">' . esc_html( __( 'Remaining Characters :', 'miniorange-otp-verification' ) ) . ' <span id="remaining_' . esc_attr( $textarea_tag ) . '"></span> </span>
								</div>
							</div>

							<div class="w-full flex">
								<div class="flex-1">
									<h5 class="mo-title flex items-center gap-mo-2">' . wp_kses(
										$tag_icon,
										array(
											'svg'  => array(
												'width'   => true,
												'height'  => true,
												'viewbox' => true,
												'fill'    => true,
											),
											'g'    => array( 'id' => true ),
											'path' => array(
												'id'   => true,
												'd'    => true,
												'fill' => true,
											),
										)
									) . ' Free Tags</h5>
									<p class="mo-caption mt-mo-2"></p>
								</div>
								<div class="flex-1 mo-tags-section">';
foreach ( $tags as $val ) {
	echo '							<div class="mo-tag bg-slate-100">' . esc_attr( $val ) . ' </div>';
}
						echo '	</div>
							</div>
						</div>
					</div>';
