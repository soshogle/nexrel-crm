<?php
/**
 * @license GPL-2.0-or-later
 *
 * Modified by James Kemp on 30-December-2025 using Strauss.
 * @see https://github.com/BrianHenryIE/strauss
 */ declare( strict_types=1 );

namespace Iconic_WooThumbs_NS\StellarWP\Uplink\Components;

use Iconic_WooThumbs_NS\StellarWP\Uplink\View\Contracts\View;

/**
 * Component/View controller made to accept arguments and render
 * them in a view file.
 */
abstract class Controller {

	/**
	 * The View Engine to render views.
	 *
	 * @var View
	 */
	protected $view;

	/**
	 * Render the view file.
	 *
	 * @param  mixed[]  $args  An optional array of arguments to utilize when rendering.
	 */
	abstract public function render( array $args = [] ): void;

	/**
	 * @param  View  $view  The View Engine to render views.
	 */
	public function __construct( View $view ) {
		$this->view = $view;
	}

	/**
	 * Format an array of CSS classes into a string.
	 *
	 * @param  array  $classes
	 *
	 * @return string
	 */
	protected function classes( array $classes ): string {
		if ( ! $classes ) {
			return '';
		}

		$classes = array_unique( array_map( 'sanitize_html_class', array_filter( $classes ) ) );

		return implode( ' ', $classes );
	}

}
