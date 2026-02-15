<?php
/**
 * Load admin view for General Settings Tab.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoConstants;
use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;

echo '<div id="generalSettingsSubTabContainer" class="mo-subpage-container ' . esc_attr( $hidden ) . '">
		<form name="f" method="post" action="" id="mo_otp_verification_settings">
			<input type="hidden" name="option" value="mo_general_settings" />';

			wp_nonce_field( $nonce );
	echo '	<div class="mo-header">
				<p class="mo-heading flex-1">' . esc_html( __( 'General Settings', 'miniorange-otp-verification' ) ) . '</p>
				<input type="submit" name="save" id="save" ' . esc_attr( $disabled ) . '
							class="mo-button inverted" value="' . esc_attr( __( 'Save Settings', 'miniorange-otp-verification' ) ) . '">
			</div>
			<div class="border-b flex flex-col gap-mo-6 px-mo-4">
				<div class="w-full flex m-mo-4">
					<div class="flex-1">
						<h5 class="mo-title">' . esc_html__( 'Country Code Dropdown', 'miniorange-otp-verification' ) . '</h5>
						<p class="mo-caption mt-mo-2">' . esc_html__( 'Country code will be appended to the phone number field', 'miniorange-otp-verification' ) . '</p>
					</div>
					<div class="flex-1">
						<div id="country_code_settings" class="flex my-mo-4">
							<div class="my-mo-2 w-[46%]">' . esc_html( __( 'Select Default Country Code', 'miniorange-otp-verification' ) ) . ':</div>
							<div class="w-[50%] pr-mo-4 text-sm">';
							get_country_code_dropdown();
	echo '  		   	</div>
						</div>
						<div class="flex">
							<div class="w-[46%]">' . esc_html( __( 'Country Code', 'miniorange-otp-verification' ) ) . ': </div>
							<span id="country_code"></span>
						</div>
						<div class="my-mo-4">
							<input  type="checkbox" ' . esc_attr( mo_esc_string( $disabled, 'attr' ) ) . '
									name="show_dropdown_on_form"
									id="dropdownEnable"
									value="1"' . esc_attr( mo_esc_string( $show_dropdown_on_form, 'attr' ) ) . ' />
							' . esc_html( __( 'Show a country code dropdown on the phone field.', 'miniorange-otp-verification' ) ) . '
						</div>
					</div>
				</div>
			</div>';

	echo '	<div id="blockedEmailList">
				<div class="border-b flex flex-col gap-mo-6 px-mo-4">
					<div class="w-full flex m-mo-4">
						<div class="flex-1">
							<h5 class="mo-title">' . esc_html__( 'Blocked Email Domains', 'miniorange-otp-verification' ) . '</h5>
							<p class="mo-caption mt-mo-2">' . esc_html__( 'Please input a list of domains you wish to block.', 'miniorange-otp-verification' ) . '</p>
						</div>
						<div class="flex-1">
							<div id="blocked_email_settings" class="w-[95%] py-mo-4 pr-mo-4">
								<div class="mo-input-wrapper">
									<label class="mo-input-label">' . esc_html( __( 'Blocked Emails', 'miniorange-otp-verification' ) ) . '</label>
									<textarea name="mo_otp_blocked_email_domains" placeholder="' . esc_html( __( 'Enter semicolon-separated domains that you want to block. Eg. gmail.com;yahoo.com ', 'miniorange-otp-verification' ) ) . '" rows="4" maxlength="400" class="mo-textarea" >' . esc_attr( mo_esc_string( $otp_blocked_email_domains, 'attr' ) ) . '</textarea>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div id="blockedPhoneList">
				<div class="border-b flex flex-col gap-mo-6 px-mo-4">
					<div class="w-full flex m-mo-4">
						<div class="flex-1">
							<h5 class="mo-title">' . esc_html__( 'Blocked Phone Numbers', 'miniorange-otp-verification' ) . '</h5>
							<p class="mo-caption mt-mo-2">' . esc_html__( 'Please input a list of phone numbers you wish to block.', 'miniorange-otp-verification' ) . '</p>
						</div>
						<div class="flex-1">
							<div id="blocked_sms_settings" class="w-[95%] py-mo-4 pr-mo-4">
								<div class="mo-input-wrapper">
									<label class="mo-input-label">' . esc_html( __( 'Blocked Phone Numbers', 'miniorange-otp-verification' ) ) . '</label>
									<textarea name="mo_otp_blocked_phone_numbers" placeholder="' . esc_attr( __( 'Enter semicolon-separated phone numbers (with country code) that you want to block. Eg. +1XXXXXXXX;+91XXXXXX ', 'miniorange-otp-verification' ) ) . '" rows="4" maxlength="2000" class="mo-textarea" >' . esc_attr( mo_esc_string( $otp_blocked_phones, 'attr' ) ) . '</textarea>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>';
		echo '
			<div id="globallyBannedPhone">
				<div class="border-b flex flex-col gap-mo-6 pb-mo-4 px-mo-4">
					<div class="w-full flex m-mo-4">
						<div class="flex-1">
							<h5 class="mo-title">' . esc_html__( 'Block Globally Banned Phone Numbers', 'miniorange-otp-verification' ) . '</h5>
							<p class="mo-caption mt-mo-2 mr-mo-32">' . esc_html__( 'This feature enables admins to block the use of globally banned phone number formats, hence increases security.', 'miniorange-otp-verification' ) . '<b> ' . esc_html__( 'For eg: +1111111111 will get blocked.', 'miniorange-otp-verification' ) . '</b></p>
						</div>
						<div class="flex-1">';

		$html1 = '         <div class="pb-mo-2 pr-mo-10">
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
									<div class="my-mo-5 mr-mo-4">This is a Enterprise Plan feature. Check <a class="font-semibold text-yellow-500" href="' . esc_url( $license_url ) . '">Licensing Tab</a> to learn more.
												</a>
									</div>
								</div>
							</div>';

							$html1 = apply_filters( 'mo_globally_banned_phone_view', $html1 );

							echo wp_kses(
								$html1,
								array(
									'div'    => array( 'class' => array() ),
									'span'   => array( 'style' => array() ),
									'input'  => array(
										'type'    => array(),
										'name'    => array(),
										'class'   => array(),
										'checked' => array(),
										'value'   => array(),
									),
									'a'      => array(
										'href'  => array(),
										'class' => array(),
									),
									'svg'    => array(
										'class'   => true,
										'width'   => true,
										'height'  => true,
										'viewbox' => true,
										'fill'    => true,
									),
									'circle' => array(
										'id'           => true,
										'cx'           => true,
										'cy'           => true,
										'cz'           => true,
										'r'            => true,
										'stroke'       => true,
										'stroke-width' => true,
									),
									'g'      => array(
										'fill' => true,
										'id'   => true,
									),
									'path'   => array(
										'd'              => true,
										'fill'           => true,
										'id'             => true,
										'stroke'         => true,
										'stroke-width'   => true,
										'stroke-linecap' => true,
									),
								)
							);

							echo '
						</div>
					</div>
				</div>';
							echo '
			<div id="movoipphonenumbers">
				<div class="border-b flex flex-col gap-mo-6 pb-mo-4 px-mo-4">
					<div class="w-full flex m-mo-4">
						<div class="flex-1">
							<h5 class="mo-title">' . esc_html( __( 'Block VOIP Phone Numbers', 'miniorange-otp-verification' ) ) . '';
							mo_draw_tooltip(
								MoMessages::showMessage( MoMessages::VOIP_PHONE_TITLE ),
								MoMessages::showMessage( MoMessages::VOIP_PHONE_BODY )
							);
							echo '
							</h5><p class="mo-caption mt-mo-2 mr-mo-32">' . esc_html( __( 'This feature enables admins to block the use of VOIP phone number formats, hence increases security.', 'miniorange-otp-verification' ) ) . '</p>
						</div>
						<div class="flex-1">';

							$html1 = '         <div class="pb-mo-2 pr-mo-10">
								<div class="mo_otp_note flex gap-mo-4 my-mo-4 pt-mo-6 pb-mo-4 pr-mo-4">
									<svg width="18" class="ml-mo-4" height="18" viewBox="0 0 24 24" fill="none">
											<g id="d4a43e0162b45f718f49244b403ea8f4">
												<g id="4ea4c3dca364b4cff4fba75ac98abb38">
													<g id="2413972edc07f152c2356073861cb269">
														<path id="2deabe5f8681ff270d3f37797985a977" d="M20.8007 20.5644H3.19925C2.94954 20.5644 2.73449 20.3887 2.68487 20.144L0.194867 7.94109C0.153118 7.73681 0.236091 7.52728 0.406503 7.40702C0.576651 7.28649 0.801941 7.27862 0.980492 7.38627L7.69847 11.4354L11.5297 3.72677C11.6177 3.54979 11.7978 3.43688 11.9955 3.43531C12.1817 3.43452 12.3749 3.54323 12.466 3.71889L16.4244 11.3598L23.0197 7.38654C23.1985 7.27888 23.4233 7.28702 23.5937 7.40728C23.7641 7.52754 23.8471 7.73707 23.8056 7.94136L21.3156 20.1443C21.2652 20.3887 21.0501 20.5644 20.8007 20.5644Z" fill="orange"></path>
													</g>
												</g>
											</g>
										</svg>
									<div class="grow">
										<p class="m-mo-0">Please reach out to us for enabling</p>
										<p class="font-bold m-mo-0">' . esc_html( __( 'Block VOIP Phone numbers feature.', 'miniorange-otp-verification' ) ) . '</p>
									</div>
									<a class="mo-button medium primary" style="cursor:pointer;float:right;width:27%;" onClick="otpSupportOnClick(\'Hi! I am interested in using Block VOIP Numbers Feature for my website, can you please help me with more information?\');" >Contact Us</a>
								</div>
							</div>';

							$html1 = apply_filters( 'mo_voip_banned_phone_view', $html1 );

							echo wp_kses(
								$html1,
								array(
									'div'    => array( 'class' => array() ),
									'span'   => array( 'style' => array() ),
									'input'  => array(
										'type'    => array(),
										'name'    => array(),
										'class'   => array(),
										'checked' => array(),
										'value'   => array(),
									),
									'a'      => array(
										'onclick' => array(),
										'class'   => array(),
										'style'   => array(),
									),
									'svg'    => array(
										'class'   => true,
										'width'   => true,
										'height'  => true,
										'viewbox' => true,
										'fill'    => true,
										'style'   => true,
									),
									'circle' => array(
										'id'           => true,
										'cx'           => true,
										'cy'           => true,
										'cz'           => true,
										'r'            => true,
										'stroke'       => true,
										'stroke-width' => true,
									),
									'g'      => array(
										'fill' => true,
										'id'   => true,
									),
									'path'   => array(
										'd'              => true,
										'fill'           => true,
										'id'             => true,
										'stroke'         => true,
										'stroke-width'   => true,
										'stroke-linecap' => true,
									),
									'p'      => array( 'class' => array() ),
								)
							);

							echo '
						</div>
					</div>
				</div>
			</div>
			</div>
		</form>
	</div>';
