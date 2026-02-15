<?php
/**
 * Loads View for message bar on admin dashboard.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
echo '			<!-- Admin Message Bar -->
		<div>';
if ( ! $registered ) {
	echo '<div class="mo-alert-container mo-alert-error">
					<span>' . wp_kses(
		$register_msg,
		array(
			'a' => array(
				'href'   => array(),
				'target' => array(),
				'rel'    => array(),
			),
			'i' => array(),
			'u' => array(),
		)
	) . '			</span>
				</div>';
} elseif ( $is_free_plugin && ( '0' === $remaining_sms && 'DEMO' === $license_plan ) ) {
	$support_link  = '<a style="cursor:pointer;" onclick="otpSupportOnClick(\'Hi! Could you please provide me with the 10 free SMS transactions for testing purposes? \');"><u> otpsupport@xecurify.com</u> </a>';
	$recharge_link = '<u><i><a target="_blank" href="' . esc_url( MOV_PORTAL ) . '/initializePayment?requestOrigin=wp_otp_verification_basic_plan">' . esc_html__( 'Recharge', 'miniorange-otp-verification' ) . '</a></i></u>';
	$message       = sprintf(
		/* translators: 1: support email link, 2: recharge link */
		__( 'You don\'t have SMS transactions in your account. Contact us at %1$s to avail one-time 10 free SMS transactions or %2$s your account.', 'miniorange-otp-verification' ),
		$support_link,
		$recharge_link
	);
	echo '<div class="mo-alert-container mo-alert-error">
			<span>' . wp_kses(
		$message,
		array(
			'a' => array(
				'style'   => array(),
				'onclick' => array(),
				'href'    => array(),
				'target'  => array(),
			),
			'u' => array(),
			'i' => array(),
		)
	) . '</span>
</div>';
} elseif ( ! $activated ) {
	echo '<div class="mo-alert-container mo-alert-error">
					<span>' . wp_kses(
		$activation_msg,
		array(
			'a' => array( 'href' => array() ),
			'i' => array( 'href' => array() ),
			'u' => array( 'href' => array() ),
		)
	) . '			</span>
				</div>';
} elseif ( ! $gatewayconfigured ) {
	echo '<div class="mo-alert-container mo-alert-error">
					<span>' . wp_kses(
		$gateway_msg,
		array(
			'a' => array( 'href' => array() ),
			'i' => array( 'href' => array() ),
			'u' => array( 'href' => array() ),
		)
	) . '			</span>
				</div>';
}
echo '  </div>';
