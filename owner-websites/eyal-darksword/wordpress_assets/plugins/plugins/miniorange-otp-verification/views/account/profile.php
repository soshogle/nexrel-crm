<?php
/**
 * Load admin view for miniorange profile details.
 *
 * @package miniorange-otp-verification/views/account
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

echo '
<div class="mo-section-header">
	<p class="mo-heading grow">Account Details</p>';

if ( ( strcmp( MOV_TYPE, 'MiniOrangeGateway' ) !== 0 ) ) {
	echo ' 	<input  type="button" 
			name="sync_lnc" 
			id="sync_lnc" 
			class="mo-button secondary"
			value="' . esc_attr__( 'Sync License', 'miniorange-otp-verification' ) . '"/>	';
}
	echo ' 	<input  type="button" 
			name="remove_accnt" 
			id="remove_accnt" 
			class="mo-button secondary"
			value="' . esc_attr__( 'Log out', 'miniorange-otp-verification' ) . '"/>
			
			<input  type="button"
			name="check_btn" 
			id="check_btn"
			class="mo-button inverted" 
			value="' . esc_attr__( 'Check License', 'miniorange-otp-verification' ) . '"/>
	
</div>
<div class="px-mo-32">
	<div class="p-mo-16">
		<table class="mo-table">
			<tbody>
				<tr class="bg-white border dark:bg-gray-900 dark:border-gray-700">
					<th scope="row" class="mo-trowhead">
						Registered Email
					</th>
					<td class="mo-table-block">
						' . esc_attr( $email ) . '
					</td>
				</tr>
				<tr class="bg-slate-100 border dark:bg-gray-800 dark:border-gray-700">
					<th scope="row" class="mo-trowhead">
						Customer ID
					</th>
					<td class="mo-table-block">
						' . esc_attr( $customer_id ) . '
					</td>
				</tr>
				<tr class="bg-white border dark:bg-gray-900 dark:border-gray-700">
					<th scope="row" class="mo-trowhead">
						API Key
					</th>
					<td class="mo-table-block">
						' . esc_attr( $api_key ) . '
					</td>
				</tr>
				<tr class="bg-slate-100 border dark:bg-gray-800 dark:border-gray-700">
					<th scope="row" class="mo-trowhead">
						Token Key
					</th>
					<td class="mo-table-block">
						' . esc_attr( $token ) . '
					</td>
				</tr>
			</tbody>
		</table>
		<form id="mo_ln_form" style="display:none;" action="" method="post">';
			wp_nonce_field( $nonce );
echo '			<input type="hidden" name="option" value="check_mo_ln" />
		</form>
		<form id="remove_accnt_form" style="display:none;" action="" method="post">';
			wp_nonce_field( $nonce );
echo '			<input type="hidden" name="option" value="remove_account" />
		</form>
		<form id="sync_lnc_form" style="display:none;" action="" method="post">';
		wp_nonce_field( $nonce );
echo '			<input type="hidden" name="option" value="sync_license" />
	</form>
	</div>
 </div>
';
