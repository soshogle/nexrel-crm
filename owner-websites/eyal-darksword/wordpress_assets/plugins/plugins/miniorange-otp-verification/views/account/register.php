<?php
/**
 * Load admin view for miniorange Registration Form.
 *
 * @package miniorange-otp-verification/views/account
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$eula_url    = apply_filters( 'mo_otp_eula_url', 'https://plugins.miniorange.com/end-user-license-agreement' );
$privacy_url = apply_filters( 'mo_otp_privacy_url', 'https://plugins.miniorange.com/wp-content/uploads/2023/08/Plugins-Privacy-Policy.pdf' );

$policy_text = sprintf(
	/* translators: 1: URL to EULA page, 2: URL to privacy policy page */
	__( 'I have read and agree to the <b><u><a href="%1$s" target="_blank" rel="noopener noreferrer">end user agreement</a></u></b> and <b><u><a href="%2$s" target="_blank" rel="noopener noreferrer">plugin privacy policy</a></u></b>.', 'miniorange-otp-verification' ),
	esc_url( $eula_url ),
	esc_url( $privacy_url )
);

$site_host  = '';
$parsed_url = wp_parse_url( home_url() );
if ( isset( $parsed_url['host'] ) ) {
	$site_host = $parsed_url['host'];
}

echo '	<form name="f" method="post" action="" id="register-form" class="mo-content-wrapper p-mo-32 justify-center items-center">';
			wp_nonce_field( $nonce );
echo '		<input type="hidden" name="option" value="mo_registration_register_customer" />
			<div class="bg-white rounded-xl w-[75%] px-mo-32 flex flex-col gap-mo-4">
				<p class="mo-heading mb-mo-6">Create new account</p>
				<div class="w-full mo-input-wrapper group group">
					<label  class="mo-input-label">Email</label>
					<input class="w-full mo-input" type="email" name="email"
							required placeholder=""
							value="' . esc_attr( $mo_current_user->user_email ) . '" />
				</div>

				<div class="w-full mo-input-wrapper group group">
					<label  class="mo-input-label">Website or Company Name</label>
					<input class="w-full mo-input" type="text" name="company"
							required placeholder=""
							value="' . esc_attr( $site_host ) . '" />
				</div>
				<div id="mo-phone-wrapper" class="w-full mo-input-wrapper group group">
					<label class="mo-input-label">' . esc_html__( 'Phone', 'miniorange-otp-verification' ) . '</label>
					<input class="w-full mo-input" type="text" name="phone"
							placeholder="' . esc_attr__( 'Enter your Phone', 'miniorange-otp-verification' ) . '"
							value="' . esc_attr( $mo_current_user->user_phone ) . '" />
				</div>
				
				<div class="flex items-center gap-mo-4">

					<div class="w-full mo-input-wrapper group group">
						<label  class="mo-input-label">First Name</label>
						<input class="w-full mo-input" type="text" name="fname"
							placeholder=""
							value="' . esc_attr( $mo_current_user->user_firstname ) . '" />
					</div>
				
					<div class="w-full mo-input-wrapper group group">
						<label  class="mo-input-label">Last Name</label>
						<input class="w-full mo-input" type="text" name="lname"
							placeholder=""
							value="' . esc_attr( $mo_current_user->user_lastname ) . '" />
					</div>

				</div>

				<div class="flex items-center gap-mo-4">

					<div class="w-full mo-input-wrapper group group">
						<label class="mo-input-label">Password Min. Length 6</label>
						<input class="w-full mo-input" type="password" name="password"
							placeholder="" />
					</div>
				
					<div class="w-full mo-input-wrapper group group">
						<label class="mo-input-label">Confirm Password</label>
						<input class="w-full mo-input" type="password" name="confirmPassword"
							placeholder="" />
					</div>

				</div>
				<div class="flex gap-mo-2">
				<input  type="checkbox"
								class="form_options" 
								style="margin-top: 0.1rem;"
								id="mo_agree_plugin_policy" 
								name="mo_customer_validation_agree_plugin_policy" 
								value="1"/> 
						<span>' . wp_kses_post( $policy_text ) . '</span>
				</div>

				<input type="submit" disabled id="mo_user_register" name="submit" value="' . esc_attr__( 'Register', 'miniorange-otp-verification' ) . '"
							class="mo-button primary" />
				<button type="submit" form="goToLoginPageForm" class="mo-button secondary">' . esc_html__( 'Already Have an Account? Sign In', 'miniorange-otp-verification' ) . '</button>

			</div>
		</form>
		<form id="goToLoginPageForm" method="post" action="">';
		wp_nonce_field( $nonce );
echo '		<input type="hidden" name="option" value="mo_go_to_login_page" />
		</form>';
