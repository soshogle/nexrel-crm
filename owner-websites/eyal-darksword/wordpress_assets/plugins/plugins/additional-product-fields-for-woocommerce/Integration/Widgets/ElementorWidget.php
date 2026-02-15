<?php

namespace rednaowooextraproduct\Integration\Widgets;

use rednaowooextraproduct\core\Loader;

class ElementorWidget extends \Elementor\Widget_Base
{

    public function get_title() {
        return esc_html__( 'Extra Product Options', 'rednaowooextraproduct' );
    }


    public function get_name() {
        return 'rednaowooextraproduct-additional-options';
    }

    public function get_categories() {
        return [ 'woocommerce-elements-single' ];
    }

    public function get_keywords() {
        return [ 'options', 'extra product', 'extra product options'];
    }

    public function render(){
        return 'test';
    }

    protected function content_template() {
        /** @var Loader $loader */
        $loader=null;
        $loader=apply_filters('woo_extra_products_get_loader',$loader);
        ?>


        <div style="background-color: white;text-align: center;padding: 5px;border: 1px solid #ccc;">
            <img src="<?php echo $loader->URL  ?>images/icon.jpg"/>
            <h5>Additional Product Options</h5>
            <p style="font-style: italic">This section is going to contain the extra product options</p>
        </div>

        <?php
    }

}