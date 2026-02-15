<?php
/**
 * The template for displaying [vc_flexbox_container_item] shortcode output of 'Flexbox Item' element.
 *
 * This template can be overridden by copying it to yourtheme/vc_templates/vc_flexbox_container_item.php
 *
 * @see https://kb.wpbakery.com/docs/developers-how-tos/change-shortcodes-html-output
 * @var array $atts
 * @var string $content - shortcode content
 */

if ( ! defined( 'ABSPATH' ) ) {
	die( '-1' );
}
?>

<div <?php $this->output_wrapper_attributes( $atts ); ?>>
	<div class="vc_flexbox_container_item-inner <?php $this->output_custom_css_class( $atts, 'vc_flexbox_container_item' ); ?>">
		<div class="wpb_wrapper">
			<?php echo wpb_js_remove_wpautop( $content ); //phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</div>
	</div>
</div>
