<?php
/**
 * Show widget
 *
 * This template can be overridden by copying it to yourtheme/woocommerce-multi-currency/woo-multi-currency-selector.php
 *
 * @author        Cuong Nguyen
 * @package       Woo-currency/Templates
 * @version       1.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$currencies       = $settings->get_list_currencies();
$current_currency = $settings->get_current_currency();
$links            = $settings->get_links();
$currency_name    = get_woocommerce_currencies();
$id               = WOOMULTI_CURRENCY_Frontend_Shortcode::get_shortcode_id();
?>
<div id="<?php echo esc_attr( $id ) ?>"
     class="woocommerce-multi-currency shortcode">
    <div class="wmc-currency">
        <select class="wmc-nav wmc-select-currency-js">
			<?php
			foreach ( $links as $code => $link ) {
				$value = $settings->enable_switch_currency_by_js() ? esc_html( $code ) : esc_url( $link );
				$name  = $shortcode == 'default' ? $currency_name[ $code ] : ( $shortcode == 'listbox_code' ? $code : '' );
				$name  = apply_filters( 'wmc_shortcode_currency_display_text', $name, $code, $shortcode, $currency_name, $settings );
				?>
                <option data-currency="<?php echo esc_attr( $code ) ?>" <?php selected( $current_currency, $code ) ?>
                        value="<?php echo esc_attr( $value ) ?>">
					<?php echo esc_html( $name ) ?>
                </option>
				<?php
			}
			?>
        </select>
    </div>
</div>
