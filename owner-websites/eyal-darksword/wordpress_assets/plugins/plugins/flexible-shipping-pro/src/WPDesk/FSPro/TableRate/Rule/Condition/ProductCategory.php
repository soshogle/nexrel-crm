<?php
/**
 * Class ProductCategory
 *
 * @package WPDesk\FSPro\TableRate\Rule\Condition
 */

namespace WPDesk\FSPro\TableRate\Rule\Condition;

use FSProVendor\WPDesk\Forms\Field\BasicField;
use FSVendor\WPDesk\Forms\Field\SelectField;
use Psr\Log\LoggerInterface;
use WPDesk\FS\TableRate\Rule\Condition\AbstractCondition;
use FSVendor\WPDesk\Forms\Field;
use WPDesk\FS\TableRate\Rule\ShippingContents\ShippingContents;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory\AjaxHandler;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory\CategoriesOptions;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory\ProductCategoryContentsFilterAll;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory\ProductCategoryContentsFilterAny;
use WPDesk\FSPro\TableRate\Rule\Condition\ProductCategory\ProductCategoryContentsFilterNone;

/**
 * Product Category Condition.
 */
class ProductCategory extends AbstractCondition {

	use ConditionOperators;

	const ANY_CATEGORY = 'any';
	const NONE = 'none';

	const PREDEFINED_VALUES = [
		self::ANY_CATEGORY,
		self::NONE,
	];

	const CONDITION_ID = 'product_category';

	/**
	 * @var CategoriesOptions
	 */
	private $categories;

	/**
	 * ProductCategory constructor.
	 *
	 * @param CategoriesOptions $categories .
	 * @param int               $priority   .
	 */
	public function __construct( CategoriesOptions $categories, $priority = 10 ) {
		$this->condition_id = self::CONDITION_ID;
		$this->name         = __( 'Product category', 'flexible-shipping-pro' );
		$this->description  = __( 'Shipping cost based on the selected product categories', 'flexible-shipping-pro' );
		$this->group        = __( 'Product', 'flexible-shipping-pro' );
		$this->categories   = $categories;
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
	 * @param array $contents .
	 *
	 * @return string
	 */
	private function format_input_data_for_logger( array $contents ) {
		$format_input_data = '';

		foreach ( $this->get_product_categories_from_contents( $contents ) as $product_category ) {
			$format_input_data .= $product_category . ', ';
		}

		return trim( $format_input_data, ', ' );
	}

	/**
	 * @param array $condition_settings .
	 *
	 * @return array
	 */
	public function prepare_settings( $condition_settings ) {
		$categories = isset( $condition_settings[ self::CONDITION_ID ] ) ? $condition_settings[ self::CONDITION_ID ] : '';
		if ( ! is_array( $categories ) ) {
			$categories                               = [];
			$condition_settings[ self::CONDITION_ID ] = [];
		}
		$categories_options = [];
		foreach ( $categories as $single_category ) {
			$option = $this->categories->get_category_option( $single_category );
			if ( $option ) {
				$categories_options[] = $option;
			}
		}

		$condition_settings['select_options'] = $categories_options;

		return $condition_settings;
	}


	/**
	 * @param array $contents .
	 *
	 * @return array
	 */
	private function get_product_categories_from_contents( array $contents ) {
		$contents_product_categories = [];
		foreach ( $contents as $contents_item ) {
			$product            = $this->get_product_from_contents_item( $contents_item );
			$product_categories = $product->get_category_ids();
			if ( 0 === count( $product_categories ) ) {
				$contents_product_categories[ self::NONE ] = __( 'None (category not set)', 'flexible-shipping-pro' );
			} else {
				foreach ( $product_categories as $product_category ) {
					$contents_product_categories[ $product_category ] = $this->categories->get_category_option( $product_category )['label'];
				}
			}
		}

		return $contents_product_categories;
	}

	/**
	 * @param array $contents_item .
	 *
	 * @return \WC_Product
	 */
	private function get_product_from_contents_item( array $contents_item ) {
		return $contents_item['data'];
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

		$product_categories = isset( $condition_settings[ self::CONDITION_ID ] ) ? $condition_settings[ self::CONDITION_ID ] : [];
		$product_categories = is_array( $product_categories ) ? $product_categories : [ $product_categories ];

		$formatted_product_categories = '';
		foreach ( $product_categories as $product_category ) {
			if ( in_array( $product_category, self::PREDEFINED_VALUES, true ) ) {
				$formatted_product_categories .= $product_category . ', ';
			} else {
				$formatted_product_categories .= $this->categories->get_category_option( $product_category )['label'] . ', ';
			}
		}
		$formatted_product_categories = trim( $formatted_product_categories, ', ' );

		// Translators: input data.
		$formatted_for_log .= sprintf( __( ' product categories: %1$s;', 'flexible-shipping-pro' ), $formatted_product_categories );
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
			'any'  => _x( 'matches any', 'product-category', 'flexible-shipping-pro' ),
			'all'  => _x( 'matches all', 'product-category', 'flexible-shipping-pro' ),
			'none' => _x( 'matches none', 'product-category', 'flexible-shipping-pro' ),
		];

		return isset( $labels[ $operator ] ) ? $labels[ $operator ] : $operator;
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
				->add_class( 'product-category' )
				->set_placeholder( __( 'search product category', 'flexible-shipping-pro' ) )
				->set_label( _x( 'of', 'select', 'flexible-shipping-pro' ) )
				->add_data( 'ajax-url', $this->create_ajax_url() )
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
						'label'       => _x( 'any', 'product-category', 'flexible-shipping-pro' ),
						'description' => __( 'The rule will be used if there is at least 1 product with selected product categories in the cart', 'flexible-shipping-pro' ),
					],
					[
						'value'       => 'all',
						'label'       => _x( 'all', 'product-category', 'flexible-shipping-pro' ),
						'description' => __( 'The rule will be used if there is at least 1 product from each of selected product categories in the cart', 'flexible-shipping-pro' ),
					],
					[
						'value'       => 'none',
						'label'       => _x( 'none', 'product-category', 'flexible-shipping-pro' ),
						'description' => __( 'The rule will be used only if there are no products with selected product categories in the cart', 'flexible-shipping-pro' ),
					],
				]
			)
			->set_label( _x( 'matches', 'product-category', 'flexible-shipping-pro' ) );
		if ( $default_value ) {
			$operator_matches->set_default_value( $default_value );
		}

		return $operator_matches;
	}

	/**
	 * @return string
	 */
	private function create_ajax_url() {
		return admin_url( 'admin-ajax.php?action=' . AjaxHandler::AJAX_ACTION . '&security=' . wp_create_nonce( AjaxHandler::NONCE_ACTION ) );
	}

	/**
	 * @param ShippingContents $shipping_contents  .
	 * @param array            $condition_settings .
	 *
	 * @return ShippingContents
	 */
	public function process_shipping_contents( ShippingContents $shipping_contents, array $condition_settings ) {
		$product_categories = is_array( $condition_settings[ self::CONDITION_ID ] ) ? $condition_settings[ self::CONDITION_ID ] : [ $condition_settings[ self::CONDITION_ID ] ];

		$operator = $this->get_operator_from_settings( $condition_settings, 'any' );
		if ( 'all' === $operator ) {
			$shipping_contents->filter_contents( new ProductCategoryContentsFilterAll( $product_categories ) );
		} elseif ( 'none' === $operator ) {
			$shipping_contents->filter_contents( new ProductCategoryContentsFilterNone( $product_categories ) );
		} else {
			$shipping_contents->filter_contents( new ProductCategoryContentsFilterAny( $product_categories ) );
		}

		return $shipping_contents;
	}

}
