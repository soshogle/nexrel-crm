<?php
/**
 * Tracking info email template.
 * Shows tracking information in the HTML order email
 *
 * @package WC_Shipment_Tracking
 * @version 1.6.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! isset( $items ) || ! is_array( $items ) || count( $items ) === 0 ) {
	exit;
}
?>

<h3>
	<?php
	/**
	 * Filter to change the content title of the email.
	 *
	 * @param string $content_title Content title.
	 *
	 * @since 1.3.7
	 */
	echo esc_html( apply_filters( 'woocommerce_shipment_tracking_my_orders_title', __( 'Tracking Information', 'woocommerce-shipment-tracking' ) ) );
	?>
</h3>

<?php
foreach ( $items as $item ) {
	// translators: %s is for formatted date shipped value.
	$date_shipped_text = ! empty( $item['formatted_date_shipped_i18n'] ) ? sprintf( __( 'Shipped on %s', 'woocommerce-shipment-tracking' ), $item['formatted_date_shipped_i18n'] ) : __( 'No shipping date', 'woocommerce-shipment-tracking' );
	?>
	<p class="tracking-content">
	<strong><?php echo esc_html( $item['formatted_tracking_provider'] ); ?></strong>
		<?php if ( strlen( $item['formatted_tracking_link'] ) > 0 ) : ?>
			- <?php printf( '<a href="%s" target="_blank" title="%s">%s</a>', esc_url( $item['formatted_tracking_link'] ), esc_attr__( 'Click here to track your shipment', 'woocommerce-shipment-tracking' ), esc_html__( 'Track', 'woocommerce-shipment-tracking' ) ); ?>
		<?php endif; ?>
		<br/>
		<em><?php echo esc_html( $item['tracking_number'] ); ?></em>
		<br />
		<?php /* translators: 1: date of shipping */ ?>
		<span style="font-size: 0.8em"><?php echo esc_html( $date_shipped_text ); ?></span>
	</p>
	<?php
}
?>
