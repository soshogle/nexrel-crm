<?php
/**
 * View file for Customer Order Message
 *
 * @package OTP\Notifications\WcSMSNotification\Views
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use OTP\Helper\MoMessages;

// Access control check - only administrators can view custom order message interface.
if ( ! function_exists( 'current_user_can' ) || ! current_user_can( 'manage_options' ) ) {
	wp_die( esc_html( MoMessages::showMessage( MoMessages::UNKNOWN_ERROR ) ) );
}

// Input validation - ensure required variables are set and properly typed.
$current_post_id = get_the_ID();
$phone_numbers   = isset( $phone_numbers ) ? sanitize_text_field( $phone_numbers ) : '';

?>

<div id="custom_order_sms_meta_box">
	<input type="hidden" 
		id="post_ID" 
		name="post_ID" 
		value="<?php echo esc_attr( $current_post_id ); ?>" />

	<div id="jsonMsg" hidden></div>

	<!-- Billing Phone Section -->
	<div class="mo-field-group">
		<label for="billing_phone">
			<b><?php echo esc_html( __( 'Billing Phone: ', 'miniorange-otp-verification' ) ); ?></b>
		</label>
		<br><br>
		<input type="text" 
			id="billing_phone" 
			class="mo-textarea" 
			name="billing_phone" 
			value="<?php echo esc_attr( $phone_numbers ); ?>" 
			style="width:100%; border-color:#E2E8F0;" />
		<br><br>
	</div>

	<!-- SMS Template Section -->
	<div class="mo-field-group">
		<label for="mo_wc_custom_order_msg">
			<b><?php echo esc_html( __( 'SMS Template: ', 'miniorange-otp-verification' ) ); ?></b>
		</label>
		<br>
		<p>
			<textarea type="text" 
				name="mo_wc_custom_order_msg" 
				id="mo_wc_custom_order_msg" 
				class="mo-textarea w-full mo_remaining_characters" 
				style="width: 100%;" 
				placeholder="Write your message here..."></textarea>
			<span id="characters" style="font-size:12px;">
				Remaining Characters : <span id="remaining_mo_wc_custom_order_msg">160</span>
			</span>
		</p>
	</div>

	<!-- Send Button Section -->
	<div class="mo-button-group">
		<p>
			<a class="mo-button inverted" 
				id="mo_custom_order_send_message">
				<?php echo esc_html( __( 'Send SMS', 'miniorange-otp-verification' ) ); ?>
			</a>
		</p>
	</div>
</div>

<!-- Note Section -->
<div class="mo_otp_note">
	<u><?php echo esc_html( __( 'Note for Indian Customers', 'miniorange-otp-verification' ) ); ?></u> :
	<?php echo esc_html( __( 'Please contact us on mfasupport@xecurify.com for sending Custom SMS.', 'miniorange-otp-verification' ) ); ?>
</div>
