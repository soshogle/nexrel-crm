<?php
/**
 * Loads View for SMS OTP Template settings.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoUtility;
use OTP\Helper\MoConstants;
use OTP\Helper\MoMessages;

echo '
		<div class="border-b px-mo-4" id="sms_template">
			<div class="w-full flex m-mo-4">
				<div class="flex-1">
					<h5 class="mo-title">' . esc_html__( 'SMS Template Configurations', 'miniorange-otp-verification' ) . '</h5>
					<p class="mo-caption mt-mo-2">' . esc_html__( 'Customize your SMS template', 'miniorange-otp-verification' ) . '</p>
				</div>
				<div class="flex-1">
					<div class="pr-mo-8 my-mo-6">
						<div class="mo_otp_note">
							' . wp_kses(
						sprintf(
									/* translators: %s: Support email address in bold */
							__( 'To prevent spamming and spoofing, we have enabled secure customization of SMS templates. Contact us at %s with your desired template and target country.', 'miniorange-otp-verification' ),
							'<b>' . esc_html( 'otpsupport@xecurify.com' ) . '</b>'
						),
						array(
							'b' => array(),
						)
					) . '
						</div>
					</div>
					<div class="pr-mo-8 my-mo-6">
						<div class="mo_otp_note">
						' . wp_kses(
						sprintf(
								/* translators: 1: DLT registration link, 2: support email link */
							__( 'For Indian customers: To modify SMS templates, first register them on the DLT portal. Learn about the registration process at %1$s. (If you are using the miniOrange gateway once the template is registered, contact us at %2$s.)', 'miniorange-otp-verification' ),
							sprintf(
								'<a href="%1$s" target="_blank" rel="noopener noreferrer">%2$s</a>',
								esc_url( 'https://plugins.miniorange.com/dlt-registration-process-for-sending-sms' ),
								esc_html__( 'DLT Registration', 'miniorange-otp-verification' )
							),
							sprintf(
								'<a style="cursor:pointer;" onClick="otpSupportOnClick();">%s</a>',
								esc_html( 'otpsupport@xecurify.com' )
							)
						),
						array(
							'a' => array(
								'href'    => array(),
								'target'  => array(),
								'rel'     => array(),
								'style'   => array(),
								'onclick' => array(),
							),
						)
					) . '
							</div>
					</div>
				</div>
			</div>';

echo '
		</div>

		<div class="border-b px-mo-4" id="email_template">
			<div class="w-full flex m-mo-4">
				<div class="flex-1">
					<h5 class="mo-title">' . esc_html__( 'Email Template Configurations', 'miniorange-otp-verification' ) . '</h5>
					<p class="mo-caption mt-mo-2 mr-mo-8">' . esc_html__( 'Customize your Email template and from Email address', 'miniorange-otp-verification' ) . '</p>
				</div>
				<div class="flex-1">
					<div class="pr-mo-8 my-mo-6">
						<div class="mo_otp_note">
							' . wp_kses(
						sprintf(
							/* translators: %s: Premium Plan link */
							__( 'To prevent spamming, email template customization is available in premium plans. Please upgrade to the %s.', 'miniorange-otp-verification' ),
							'<a class="font-semibold text-yellow-500" href="' . esc_url( $license_url ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Premium Plan', 'miniorange-otp-verification' ) . '</a>'
						),
						array(
							'a' => array(
								'href'   => array(),
								'target' => array(),
								'rel'    => array(),
								'class'  => array(),
							),
						)
					) . ' ';
			mo_draw_tooltip(
				MoMessages::showMessage( MoMessages::EMAIL_SENDER_HEADER ),
				MoMessages::showMessage( MoMessages::EMAIL_SENDER_BODY )
			);
			echo '   	</div>
					</div>
				</div>
			</div>
		</div>';
