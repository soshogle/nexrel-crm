<?php
/**
 * Class Tag
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition;

use FSProVendor\WPDesk\Forms\Field\BasicField;
use FSVendor\WPDesk\Forms\Field\SelectField;
use Psr\Log\LoggerInterface;
use WC_Product;
use WP_Term;
use WPDesk\FS\TableRate\Rule\Condition\AbstractCondition;
use FSVendor\WPDesk\Forms\Field;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductTag\AjaxHandler;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductTag\ProductTagContentsFilterAll;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductTag\ProductTagContentsFilterAny;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductTag\ProductTagContentsFilterNone;

/**
 * Tag Condition.
 */
class ProductTag extends AbstractCondition {

	use ConditionOperators;

	const CONDITION_ID = 'product_tag';

	/**
	 * ProductTag constructor.
	 *
	 * @param int $priority .
	 */
	public function __construct( $priority = 10 ) {
		$this->condition_id = self::CONDITION_ID;
		$this->name         = __( 'Product tag', 'flexible-shipping-pro' );
		$this->group        = __( 'Product', 'flexible-shipping-pro' );
		$this->description  = __( 'Shipping cost based on the selected product tags', 'flexible-shipping-pro' );
		$this->priority     = $priority;
	}

	/**
	 * @param array            $condition_settings .
	 * @param ShippingContents $contents           .
	 * @param LoggerInterface  $logger             .
	 *
	 * @return bool
	 */
	public function is_condition_matched( array $condition_settings, ShippingContents $contents, LoggerInterface $logger ) {
		$condition_matched = 0 !== count( $contents->get_contents() );

		$logger->debug( $this->format_for_log( $condition_settings, $condition_matched, $this->format_input_data_for_logger( $contents->get_contents() ) ) );

		return $condition_matched;
	}

	/**
	 * @param array $condition_settings .
	 *
	 * @return array
	 */
	public function prepare_settings( $condition_settings ) {
		$tags = $this->get_tags( $condition_settings );

		if ( ! $tags ) {
			return $condition_settings;
		}

		$options = array_map( [ $this, 'prepare_item_option' ], $tags );

		$condition_settings['select_options'] = array_values( $options );

		return $condition_settings;
	}

	/**
	 * @param WP_Term $item .
	 *
	 * @return array
	 */
	public function prepare_item_option( $item ) {
		return $this->prepare_option( $item->term_id, $item->name );
	}

	/**
	 * @return Field[]
	 */
	public function get_fields() {
		$fields = [
			$this->prepare_operator_matches(),
			( new Field\WooSelect() )
				->set_name( self::CONDITION_ID )
				->set_multiple()
				->add_class( 'product-tag' )
				->set_placeholder( __( 'search tags', 'flexible-shipping-pro' ) )
				->set_label( _x( 'of', 'select', 'flexible-shipping-pro' ) )
				->add_data( 'ajax-url', $this->get_ajax_url() )
				->add_data( 'async', true )
				->add_data( 'autoload', true ),
		];

		return $fields;
	}

	/**
	 * @param string|null $default_value .
	 *
	 * @return SelectField
	 */
	private function prepare_operator_matches( $default_value = null ) {
		$operator_matches = ( new SelectField() )
			->set_name( $this->get_operator_field_name() )
			->set_options(
				[
					[
						'value'       => 'any',
						'label'       => _x( 'any', 'product-tag', 'flexible-shipping-pro' ),
						'description' => __( 'The rule will be used if there is at least 1 product with selected product tags in the cart', 'flexible-shipping-pro' ),
					],
					[
						'value'       => 'all',
						'label'       => _x( 'all', 'product-tag', 'flexible-shipping-pro' ),
						'description' => __( 'The rule will be used if there is at least 1 product from each of selected product tags in the cart', 'flexible-shipping-pro' ),
					],
					[
						'value'       => 'none',
						'label'       => _x( 'none', 'product-tag', 'flexible-shipping-pro' ),
						'description' => __( 'The rule will be used only if there are no products with selected product tags in the cart', 'flexible-shipping-pro' ),
					],
				]
			)
			->set_label( _x( 'matches', 'product-tag', 'flexible-shipping-pro' ) );
		if ( $default_value ) {
			$operator_matches->set_default_value( $default_value );
		}

		return $operator_matches;
	}

	/**
	 * @param ShippingContents $shipping_contents  .
	 * @param array            $condition_settings .
	 *
	 * @return ShippingContents
	 */
	public function process_shipping_contents( ShippingContents $shipping_contents, array $condition_settings ) {
		$tags = $this->get_tags( $condition_settings );

		$operator = $this->get_operator_from_settings( $condition_settings, 'any' );
		if ( 'all' === $operator ) {
			$shipping_contents->filter_contents( new ProductTagContentsFilterAll( $tags ) );
		} elseif ( 'none' === $operator ) {
			$shipping_contents->filter_contents( new ProductTagContentsFilterNone( $tags ) );
		} else {
			$shipping_contents->filter_contents( new ProductTagContentsFilterAny( $tags ) );
		}

		return $shipping_contents;
	}

	/**
	 * @param array  $condition_settings .
	 * @param bool   $condition_matched  .
	 * @param string $input_data         .
	 *
	 * @return string
	 */
	protected function format_for_log( array $condition_settings, $condition_matched, $input_data ) {
		// Translators: condition name.
		$formatted_for_log = '   ' . sprintf( __( 'Condition: %1$s;', 'flexible-shipping-pro' ), $this->get_name() );

		// Translators: operator.
		$formatted_for_log .= sprintf( __( ' operator: %1$s;', 'flexible-shipping-pro' ), $this->get_operator_label( $this->get_operator_from_settings( $condition_settings, 'all' ) ) );

		$tags = $this->get_tags( $condition_settings );

		$formatted_products = [];

		foreach ( $tags as $tag ) {
			$formatted_products[] = $tag->name;
		}

		// Translators: input data.
		$formatted_for_log .= sprintf( __( ' tags: %1$s;', 'flexible-shipping-pro' ), join( ', ', $formatted_products ) );
		// Translators: input data.
		$formatted_for_log .= sprintf( __( ' input data: %1$s;', 'flexible-shipping-pro' ), $input_data );
		// Translators: matched condition.
		$formatted_for_log .= sprintf( __( ' matched: %1$s', 'flexible-shipping-pro' ), ( $condition_matched ) ? __( 'yes', 'flexible-shipping-pro' ) : __( 'no', 'flexible-shipping-pro' ) );

		return $formatted_for_log;
	}

	/**
	 * @param string $operator .
	 *
	 * @return string
	 */
	private function get_operator_label( $operator ) {
		$labels = [
			'any'  => _x( 'matches any', 'product-tag', 'flexible-shipping-pro' ),
			'all'  => _x( 'matches all', 'product-tag', 'flexible-shipping-pro' ),
			'none' => _x( 'matches none', 'product-tag', 'flexible-shipping-pro' ),
		];

		return isset( $labels[ $operator ] ) ? $labels[ $operator ] : $operator;
	}

	/**
	 * @param array $contents .
	 *
	 * @return string
	 */
	private function format_input_data_for_logger( array $contents ) {
		$format_input_data = [];

		foreach ( $contents as $contents_item ) {
			$product = $this->get_product_from_contents_item( $contents_item );

			$terms = get_the_terms( $product->get_id(), 'product_tag' );

			if ( ! $terms ) {
				continue;
			}

			foreach ( $terms as $term ) {
				$format_input_data[] = $term->name;
			}
		}

		return join( ', ', array_unique( $format_input_data ) );
	}

	/**
	 * @param array $contents_item .
	 *
	 * @return WC_Product
	 */
	private function get_product_from_contents_item( array $contents_item ) {
		return $contents_item['data'];
	}

	/**
	 * @return string
	 */
	private function get_ajax_url() {
		return admin_url( 'admin-ajax.php?action=' . AjaxHandler::AJAX_ACTION . '&security=' . wp_create_nonce( AjaxHandler::NONCE_ACTION ) );
	}

	/**
	 * @param string $value .
	 * @param string $label .
	 *
	 * @return array
	 */
	private function prepare_option( $value, $label ) {
		return [
			'value' => $value,
			'label' => $label,
		];
	}

	/**
	 * @param array $condition_settings .
	 *
	 * @return WP_Term[]
	 */
	private function get_tags( $condition_settings ) {
		if ( ! isset( $condition_settings[ self::CONDITION_ID ] ) ) {
			return [];
		}

		$items = wp_parse_id_list( $condition_settings[ self::CONDITION_ID ] );

		return array_filter( array_map( 'get_term', array_filter( $items ) ) );
	}
}
