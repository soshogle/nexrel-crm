<?php
/**
 * Loads View for List of all the addons.
 *
 * @package miniorange-otp-verification/views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoConstants;
use OTP\Helper\MoMessages;
use OTP\Helper\MoUtility;

$current_page = MoUtility::get_current_page_parameter_value( 'page', '' );
$request_uri  = admin_url( 'admin.php' );
if ( ! empty( $current_page ) ) {
	$request_uri = add_query_arg( array( 'page' => $current_page ), $request_uri );
}
$request_uri = remove_query_arg( array( 'addon', 'form', 'subpage' ), $request_uri );
$license_url = add_query_arg( array( 'page' => 'mootppricing' ), $request_uri );

echo '
		<div class="mo-header">
			<p class="mo-heading flex-1">' . esc_html__( 'Gateway Settings', 'miniorange-otp-verification' ) . '</p>
			<input type="submit" name="save" ' . esc_attr( $disabled ) . '
						class="mo-button inverted" disabled value="' . esc_attr( __( 'Save Settings', 'miniorange-otp-verification' ) ) . '">
		</div>
				<div class="border-b flex flex-col gap-mo-6 px-mo-4">
					<div class="w-full flex m-mo-4">
						<div class="flex-1">
							<h5 class="mo-title">' . esc_html__( 'SMS Gateway Configurations', 'miniorange-otp-verification' ) . '</h5>
							<div class="mo-caption mt-mo-2 mr-mo-20">';
/* translators: 1: default gateway name, 2: link to buy SMS transactions, 3: link to check plans */
$mo_sms_gateway_text = __(
	'SMS Gateway is a service provider for sending SMS on your behalf to your users. Your default SMS gateway is %1$s. <br> You can %2$s or %3$s.',
	'miniorange-otp-verification'
);

$default_gateway = '<b>' . esc_html__( 'miniOrange gateway', 'miniorange-otp-verification' ) . '</b>';

$recharge_url     = add_query_arg(
	'requestOrigin',
	'wp_otp_verification_basic_plan',
	trailingslashit( MOV_PORTAL ) . 'initializePayment'
);
$buy_transactions = sprintf(
	/* translators: 1: <a><u><i> open tags, 2: link text, 3: </i></u></a> close tags */
	'%1$s%2$s%3$s',
	'<a style="cursor:pointer;" target="_blank" rel="noopener noreferrer" href="' . esc_url( $recharge_url ) . '"><u><i>',
	esc_html__( 'buy SMS transactions from the miniOrange gateway', 'miniorange-otp-verification' ),
	'</i></u></a>'
);

$check_plans = sprintf(
	/* translators: 1: line break, 2: <a><u><i> open tags, 3: link text, 4: </i></u></a> close tags */
	__( '%1$s %2$s check our gateway-based plans %3$s', 'miniorange-otp-verification' ),
	'<br>',
	'<a href="' . esc_url( $license_url ) . '" target="_blank" rel="noopener noreferrer"><u><i>',
	'</i></u></a>',
);

echo wp_kses(
	sprintf( $mo_sms_gateway_text, $default_gateway, $buy_transactions, $check_plans ),
	array(
		'u'  => array(),
		'i'  => array(),
		'b'  => array(),
		'br' => array(),
		'a'  => array(
			'href'   => array(),
			'style'  => array(),
			'target' => array(),
			'rel'    => array(),
		),
	)
);
echo '						</div>
						</div>
						<div class="flex-1 pr-mo-4 pl-mo-2 py-mo-4">
							<div class="flex">
								<div class="w-[46%] my-mo-2">' . esc_html( __( 'Select Gateway type', 'miniorange-otp-verification' ) ) . ': </div>
								<div class="mo-select-wrapper w-[46%]">
									<select id="custom_gateway_type" disabled name="mo_customer_validation_custom_gateway_type">
										<option value="MoGateway">' . esc_html__( 'miniOrange Gateway', 'miniorange-otp-verification' ) . '</option>
									</select>									
								</div>
							</div>
							<div class="flex-1">
								<div class="pb-mo-2 pr-mo-10">
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
										<div class="my-mo-5 mr-mo-4">' . esc_html__( 'To use your custom SMS Gateway, upgrade to the premium plan.', 'miniorange-otp-verification' ) . ' 
													<br>' . wp_kses(
											sprintf(
															/* translators: %s: Licensing tab link */
												__( 'Check %s to learn more.', 'miniorange-otp-verification' ),
												'<a class="font-semibold text-yellow-500" target="_blank" href="' . esc_url( $license_url ) . '">' . esc_html__( 'Licensing Tab', 'miniorange-otp-verification' ) . '</a>'
											),
											array(
												'a' => array(
													'href' => array(),
													'class' => array(),
													'target' => array(),
												),
											)
										) . '
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="border-b flex flex-col gap-mo-6 px-mo-4">
					<div class="w-full flex m-mo-4">
						<div class="flex-1">
							<h5 class="mo-title">' . esc_html__( 'Email Gateway(SMTP) Configurations', 'miniorange-otp-verification' ) . '</h5>
							<p class="mo-caption mt-mo-2">' . esc_html__( 'SMTP Gateway is a service provider for sending Emails on your behalf to your users.', 'miniorange-otp-verification' ) . '</p>
							
						</div>
						<div class="flex-1 pr-mo-4 pl-mo-2 py-mo-4">
							<div class="flex-1">
								<div class="pb-mo-2 pr-mo-10 flex flex-col gap-mo-4">
									<div>
										<input  type="radio" ' . esc_attr( $disabled ) . ' 
												id="mo_smtp_enable" 
												name="mo_customer_validation_smtp_enable_type"
												class="app_enable"
												value="mo_smtp_enable" 
												checked />
										' . esc_html__( 'Enable miniOrange SMTP', 'miniorange-otp-verification' ) . '
									</div>
									<div class="flex gap-mo-4">
										<p>
											<input  type="radio" disabled 
													id="mo_your_own_smtp_enable"
													name="mo_customer_validation_smtp_enable_type"
													class="app_enable"
													value="mo_your_own_smtp_enable" />
											' . esc_html__( 'Enable your own SMTP', 'miniorange-otp-verification' ) . '
										
										';
		mo_draw_tooltip(
			MoMessages::showMessage( MoMessages::USE_YOUR_SMTP_HEADER ),
			MoMessages::showMessage( MoMessages::USE_YOUR_SMTP )
		);
									echo '
										<span class="tooltip">' . wp_kses( MoConstants::MO_CROWN_SVG, MoUtility::mo_allow_svg_array() ) . '
											<span class="tooltiptext prem_form_tooltip" >
												<span  class="header prem_form_header" ><b>' . esc_html( __( 'Premium Feature ', 'miniorange-otp-verification' ) ) . '</b></span>
												<span class="body">' . wp_kses(
													sprintf(
														/* translators: 1: <a> open tag, 2: link text, 3: </a> close tag */
														__( 'To use your own SMTP, upgrade to the premium plan. %1$sCheck %2$s to learn more.%3$s', 'miniorange-otp-verification' ),
														'<a class="font-semibold text-yellow-500" href="' . esc_url( $license_url ) . '" target="_blank" rel="noopener noreferrer">',
														esc_html__( 'Licensing Tab', 'miniorange-otp-verification' ),
														'</a>'
													),
													array(
														'a' => array(
															'href'   => array(),
															'class'  => array(),
															'target' => array(),
															'rel'    => array(),
														),
													)
												) . '
												</span>
											</span>
										</span>
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>';

									echo '	<div class="border-b flex flex-col gap-mo-6 px-mo-4">
					<div class="w-full flex m-mo-4">
						<div class="flex-1">
							<h5 class="mo-title">' . esc_html__( 'SMS Backup Gateway Configuration', 'miniorange-otp-verification' ) . '</h5>
							<p class="mo-caption mt-mo-2 mr-mo-20">' . esc_html( __( 'When the primary gateway is unavailable, the backup SMS gateway takes over and sends the SMS messages to recipients.', 'miniorange-otp-verification' ) ) . '</p>
						</div>
						<div class="flex-1">
							<div class="pb-mo-2 pr-mo-10">
								<div class="mo_otp_note flex gap-mo-1 my-mo-4 w-[96%]">
									<svg width="18" class="my-mo-4 ml-mo-4" height="18" viewBox="0 0 24 24" fill="none">
											<g id="d4a43e0162b45f718f49244b403ea8f4">
												<g id="4ea4c3dca364b4cff4fba75ac98abb38">
													<g id="2413972edc07f152c2356073861cb269">
														<path id="2deabe5f8681ff270d3f37797985a977" d="M20.8007 20.5644H3.19925C2.94954 20.5644 2.73449 20.3887 2.68487 20.144L0.194867 7.94109C0.153118 7.73681 0.236091 7.52728 0.406503 7.40702C0.576651 7.28649 0.801941 7.27862 0.980492 7.38627L7.69847 11.4354L11.5297 3.72677C11.6177 3.54979 11.7978 3.43688 11.9955 3.43531C12.1817 3.43452 12.3749 3.54323 12.466 3.71889L16.4244 11.3598L23.0197 7.38654C23.1985 7.27888 23.4233 7.28702 23.5937 7.40728C23.7641 7.52754 23.8471 7.73707 23.8056 7.94136L21.3156 20.1443C21.2652 20.3887 21.0501 20.5644 20.8007 20.5644Z" fill="orange"></path>
													</g>
												</g>
											</g>
									</svg>
									<div class="my-mo-5 mr-mo-4">' .
									wp_kses(
										sprintf(
											/* translators: %s: Link to Licensing Tab */
											__(
												'This is an Enterprise Plan feature. Check %s to learn more.',
												'miniorange-otp-verification'
											),
											'<a class="font-semibold text-yellow-500" target="_blank"  href="' . esc_url( $license_url ) . '">' .
												esc_html__( 'Licensing Tab', 'miniorange-otp-verification' ) .
												'</a>'
										),
										array(
											'a' => array(
												'href'   => array(),
												'class'  => array(),
												'target' => array(),
											),
										)
									)
									. ' 
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>';
