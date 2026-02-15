<?php
/**
 * Element teasers template for Add Element panel.
 *
 * @since 8.7
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( '-1' );
}

if ( empty( $teasers ) ) {
	return;
}

?>
<div class="wpb-teasers-wrapper">
	<div class="wpb-teasers-description">
		<?php echo esc_html__( 'Discover elements from premium add-ons and tools designed to extend WPBakery and improve your overall WordPress site.', 'js_composer' ); ?>
	</div>

	<ul class="wpb-content-layouts wpb-teasers-grid">
		<?php foreach ( $teasers as $teaser ) : ?>
			<li class="wpb-layout-element-button wpb-teaser-item vc_visible">
				<div class="wpb-teaser-content">
					<div class="wpb-teaser-content-inner">
						<?php if ( ! empty( $teaser['is_activated'] ) ) : ?>
							<img class="wpb-teaser-icon"
								src="<?php echo esc_url( $teaser['icon_url'] ); ?>"
								alt="<?php echo esc_attr( $teaser['name'] ); ?>" />
						<?php else : ?>
							<a href="<?php echo esc_url( $teaser['learn_more_url'] ); ?>" class="wpb-teaser-icon-link"
								target="_blank"
								rel="noopener noreferrer">
								<img class="wpb-teaser-icon"
									src="<?php echo esc_url( $teaser['icon_url'] ); ?>"
									alt="<?php echo esc_attr( $teaser['name'] ); ?>" />
							</a>
						<?php endif; ?>
						<h3 class="wpb-teaser-title"><?php echo esc_html( $teaser['name'] ); ?></h3>
						<p class="wpb-teaser-description"><?php echo esc_html( $teaser['description'] ); ?></p>
					</div>
					<div class="wpb-teaser-action">
						<?php if ( ! empty( $teaser['is_activated'] ) ) : ?>
							<span class="vc_general vc_ui-button vc_ui-button-size-sm vc_ui-button-shape-rounded wpb-teaser-installed">
								<?php esc_html_e( 'Activated', 'js_composer' ); ?>
							</span>
						<?php else : ?>
							<a href="<?php echo esc_url( $teaser['learn_more_url'] ); ?>"
								target="_blank"
								rel="noopener noreferrer"
								class="vc_general vc_ui-button vc_ui-button-size-sm vc_ui-button-shape-rounded vc_ui-button-action">
								<?php esc_html_e( 'Learn more', 'js_composer' ); ?>
							</a>
						<?php endif; ?>
					</div>
				</div>
			</li>
		<?php endforeach; ?>
	</ul>
</div>
