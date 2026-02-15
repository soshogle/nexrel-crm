<?php
if ( ! isset( $class, $title, $style, $settings, $currency_selected ) ) {
	return;
}
?>
<div class="woocommerce-multi-currency <?php echo esc_attr( implode( ' ', $class ) ); ?> wmc-bottom wmc-sidebar"
     style="<?php echo esc_html( $style ) ?>">
	<div class="wmc-list-currencies">
		<?php
		if ( $title ) {
			?>
			<div class="wmc-title">
				<?php echo esc_html( $title ) ?>
			</div>
			<?php
		}
		$links         = $settings->get_links();
		$currency_name = get_woocommerce_currencies();
		foreach ( $links as $k => $link ) {
			$selected = $display = '';
			$k        = esc_attr( $k );

			if ( $currency_selected == $k ) {
				$selected = 'wmc-active';
			}

			switch ( $settings->get_sidebar_style() ) {
				case 1:
					$display = get_woocommerce_currency_symbol( $k );
					break;
				case 2:
				case 3:
				case 4:
					$country = esc_html( strtolower( $settings->get_country_data( $k )['code'] ) );
					$display = "<i class='vi-flag-64 flag-{$country}'></i>";
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
							switch ( $settings->get_sidebar_style() ) {
								case 3:
									echo esc_html( $k );
									break;
								case 4:
									echo esc_html( get_woocommerce_currency_symbol( $k ) );
									break;
								default:
									echo esc_html( apply_filters( 'wmc_switcher_display_currency_name', $currency_name[ $k ], $k ) );
							}
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
