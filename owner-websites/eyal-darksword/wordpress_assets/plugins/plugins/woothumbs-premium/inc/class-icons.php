<?php
/**
 * Icons.
 *
 * @package iconic-woothumbs
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Iconic_WooThumbs_Icons.
 *
 * @since 5.0.0
 */
class Iconic_WooThumbs_Icons {
	/**
	 * Run.
	 *
	 * @param string $icon    Icon name slug.
	 * @param array  $classes Classes to add the to SVG element.
	 * @param bool   $return  True to return, false for regular output.
	 */
	public static function get_svg_icon( $icon, $classes = array(), $return = false ) {
		$classes = ( $classes ) ? implode( ' ', $classes ) : '';

		if ( 'loading' === $icon ) {
			$svg = '<svg class="' . esc_attr( $classes ) . '" aria-hidden="true" version="1.1" id="loader-1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="40px" height="40px" viewBox="0 0 50 50" style="enable-background:new 0 0 50 50;" xml:space="preserve"><path d="M43.935,25.145c0-10.318-8.364-18.683-18.683-18.683c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615c8.072,0,14.615,6.543,14.615,14.615H43.935z"><animateTransform attributeType="xml" attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="0.6s" repeatCount="indefinite" /></path></svg>';
		}

		if ( 'video' === $icon ) {
			$svg = '<svg class="' . esc_attr( $classes ) . '" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 4L12 6.4V4C12 3.46957 11.7893 2.96086 11.4142 2.58579C11.0391 2.21071 10.5304 2 10 2H2C1.46957 2 0.960859 2.21071 0.585786 2.58579C0.210714 2.96086 0 3.46957 0 4L0 12C0 12.5304 0.210714 13.0391 0.585786 13.4142C0.960859 13.7893 1.46957 14 2 14H10C10.5304 14 11.0391 13.7893 11.4142 13.4142C11.7893 13.0391 12 12.5304 12 12V9.6L16 12V4ZM2 12V4H10V12H2Z"></svg>';
		}

		if ( 'fullscreen' === $icon ) {
			$svg = '<svg class="' . esc_attr( $classes ) . '" aria-hidden="true" width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 1H15C15.5304 1 16.0391 1.21071 16.4142 1.58579C16.7893 1.96086 17 2.46957 17 3V5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 15H15C15.5304 15 16.0391 14.7893 16.4142 14.4142C16.7893 14.0391 17 13.5304 17 13V11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 1H3C2.46957 1 1.96086 1.21071 1.58579 1.58579C1.21071 1.96086 1 2.46957 1 3V5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 15H3C2.46957 15 1.96086 14.7893 1.58579 14.4142C1.21071 14.0391 1 13.5304 1 13V11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 5H8C6.89543 5 6 5.89543 6 7V9C6 10.1046 6.89543 11 8 11H10C11.1046 11 12 10.1046 12 9V7C12 5.89543 11.1046 5 10 5Z"/></svg>';
		}

		if ( 'arrow-left' === $icon ) {
			$svg = '<svg class="' . esc_attr( $classes ) . '" aria-hidden="true" width="9" height="16" viewBox="0 0 9 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1L1 8L8 15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
		}

		if ( 'arrow-right' === $icon ) {
			$svg = '<svg class="' . esc_attr( $classes ) . '" aria-hidden="true" width="9" height="16" viewBox="0 0 9 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L8 8L1 15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
		}

		if ( 'arrow-up' === $icon ) {
			$svg = '<svg class="' . esc_attr( $classes ) . '" aria-hidden="true" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.00061 4.99998L5.00061 0.999985L1.00061 4.99998" stroke-opacity="0.8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
		}

		if ( 'arrow-down' === $icon ) {
			$svg = '<svg class="' . esc_attr( $classes ) . '" aria-hidden="true" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.00012 1.00002L5.00012 5.00002L9.00012 1.00002" stroke-opacity="0.8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
		}

		if ( 'zoom' === $icon ) {
			$svg = '<svg class="' . esc_attr( $classes ) . '" aria-hidden="true" width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 16L12.7422 13.742" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 6V10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 8H6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
		}

		if ( 'close' === $icon ) {
			$svg = '<svg class="' . esc_attr( $classes ) . '" aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M11 1L1 11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 11L1 1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
		}

		if ( 'heart' === $icon ) {
			$svg = '<svg class="' . esc_attr( $classes ) . '" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.2 4.1c2.7 2.7 2.4 6.9-.4 9.5l-8.4 7.9c-.8.7-2.1.7-2.9 0l-8.4-7.9c-2.7-2.6-3-6.8-.4-9.5C4.6 1.4 9.2 1.3 12 4c2.8-2.7 7.4-2.6 10.2.1z"/></svg>';
		}

		if ( 'heart-empty' === $icon ) {
			$svg = '<svg class="' . esc_attr( $classes ) . '" aria-hidden="true" width="16" height="16" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path stroke-width="2" d="M16 28.72a3 3 0 0 1-2.13-.88l-10.3-10.3a8.72 8.72 0 0 1-2.52-6.25 8.06 8.06 0 0 1 8.14-8A8.06 8.06 0 0 1 15 5.68l1 1 .82-.82a8.39 8.39 0 0 1 11-.89 8.25 8.25 0 0 1 .81 12.36l-10.5 10.51a3 3 0 0 1-2.13.88ZM9.15 5.28A6.12 6.12 0 0 0 4.89 7a6 6 0 0 0-1.84 4.33A6.72 6.72 0 0 0 5 16.13l10.3 10.3a1 1 0 0 0 1.42 0l10.51-10.52a6.25 6.25 0 0 0 1.77-4.8 6.18 6.18 0 0 0-2.43-4.55 6.37 6.37 0 0 0-8.37.71L16.71 8.8a1 1 0 0 1-1.42 0l-1.7-1.7a6.28 6.28 0 0 0-4.4-1.82Z"/></svg>';
		}

		if ( $return ) {
			return $svg;
		} else {
			echo filter_var( $svg );
		}
	}
}
