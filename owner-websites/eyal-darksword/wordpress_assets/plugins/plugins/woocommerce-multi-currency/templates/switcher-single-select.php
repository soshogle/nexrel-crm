<?php
if ( ! isset( $class, $style, $settings, $currency_selected ) ) {
    return;
}
?>
<div class="woocommerce-multi-currency <?php echo esc_attr( implode( ' ', $class ) ); ?> wmc-bottom wmc-sidebar"
     style="<?php echo esc_html( $style ) ?>">
	<div class="wmc-list-currencies">
		<?php
		$links         = $settings->get_links();
		$currency_name = get_woocommerce_currencies();
		foreach ( $links as $k => $link ) {
			$selected = $display = '';
			$k        = esc_attr( $k );

			if ( $currency_selected == $k ) {
				$selected = 'wmc-active';
			}
			//0-def
			//1 symbol
			//2 flag
			//3 flag + code
			//4 flag + symbol
			switch ( $settings->get_sidebar_style() ) {
				case 1:
				case 4:
					$display = get_woocommerce_currency_symbol( $k );
					break;
				default:
					$display = $k;
			}

			$display = apply_filters( 'wmc_currency_sidebar_left_content', $display, $k );
			?>
			<div class="wmc-currency <?php echo esc_attr( $selected ) ?>"
			     data-currency='<?php echo esc_attr( $k ) ?>'>
				<?php
				if ( $settings->enable_switch_currency_by_js() ) {
					$link = '#';
				}
				?>
				<a rel='nofollow' class="wmc-currency-redirect"
				   data-currency="<?php echo esc_attr( $k ) ?>" href="<?php echo esc_attr( $link ) ?>">
					<span class="wmc-currency-content-left"><?php echo wp_kses_post( $display ); ?></span>
					<span class="wmc-currency-content-right">
                                <?php
                                $country = esc_html( strtolower( $settings->get_country_data( $k )['code'] ) );
                                //echo "<span class='wmc-currency-content-right-flag'><i class='vi-flag-48 flag-" . esc_html( $country ) . "'></i></span>";
                                echo '<span class="wmc-currency-content-right-name">' .
                                     esc_html( apply_filters( 'wmc_switcher_display_currency_name', $currency_name[ $k ], $k ) ) . '</span>';
                                ?>
                                </span>
				</a>
			</div>
			<?php
		}
		?>
		<div class="wmc-sidebar-open"></div>
	</div>
</div>
<?php
