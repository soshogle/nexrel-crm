<?php
/**
 * Load admin view for miniorange Login Form.
 *
 * @package miniorange-otp-verification/views/account
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

echo '	<form name="f" method="post" action="" class="mo-content-wrapper p-mo-32 justify-center items-center">';
			wp_nonce_field( $nonce );
echo '		<input type="hidden" name="option" value="mo_registration_connect_verify_customer" />
	<div class="bg-white rounded-xl w-[75%] flex px-mo-32 flex-col gap-mo-4">
		 <p class="mo-heading mb-mo-6">Login in using your miniorange account</p>
		 <div class="w-full mo-input-wrapper group group">
			 <label class="mo-input-label">Email</label>
			 <input class="w-full mo-input" type="email" name="email" value="' . esc_attr( $admin_email ) . '"
						 required placeholder=""/>
		 </div>

		 <div class="w-full mo-input-wrapper group group">
			 <label class="mo-input-label">Password</label>
			 <input class="w-full mo-input" required type="password"
						 name="password" placeholder="" />
		 </div>			

		 <div><a href="https://portal.miniorange.com/forgotpassword" target="_blank" class="text-right font-bold hover:underline float-right">' . esc_html__( 'Forgot Password', 'miniorange-otp-verification' ) . '</a></div>
		 <input type="submit" class="mo-button inverted" value="Login"/>
		 <button type="submit" form="goBacktoRegistrationPage" class="mo-button secondary">Register</button>

	</div>
</form>
<form id="forgotpasswordform" method="post" action="">';
	wp_nonce_field( $nonce );
echo '		<input type="hidden" name="option" value="mo_registration_mo_forgot_password" />
</form>
<form id="goBacktoRegistrationPage" method="post" action="">';
	wp_nonce_field( $nonce );
echo '		<input type="hidden" name="option" value="mo_registration_go_back" />
</form>';
