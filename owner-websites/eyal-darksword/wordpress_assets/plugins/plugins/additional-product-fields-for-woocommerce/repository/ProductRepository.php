<?php


namespace rednaowooextraproduct\repository;


use rednaowooextraproduct\core\Loader;
use rednaowooextraproduct\core\Utils\ArrayUtils;
use WC_Product_Attribute;


class ProductRepository
{
    const TRANSLATION_TYPE_PRODUCT=1;
    const TRANSLATION_TYPE_GLOBAL=2;
    public function GetProductExtraOptions($productId,$ignoreGlobalOptions=false,$ignoreOriginalTranslation=false)
    {

        $productId=\apply_filters('woo-extra-product-get-post-id',$productId);
        $meta= \get_post_meta($productId,'_rednao_advanced_product_options',true);

        if($meta==null&&!$ignoreOriginalTranslation)
        {
            $language=apply_filters( 'wpml_element_language_details', null, array('element_id' => $productId, 'element_type' => 'product' ) );
            if(is_object($language)&&isset($language->source_language_code))
            {
                $translatedProductId = apply_filters('wpml_object_id', $productId, 'product', FALSE, $language->source_language_code);
                if(is_numeric($translatedProductId)&&$translatedProductId!=$productId)
                {
                    $meta= \get_post_meta($translatedProductId,'_rednao_advanced_product_options',true);
                }
            }
        }
;
        if($ignoreGlobalOptions)
            return $meta;


        return apply_filters('woo_extra_products_options_added',$meta,$productId);


    }

    public function GetProductFees($productId)
    {
        $productId=\apply_filters('woo-extra-product-get-post-id',$productId);
        $meta= \get_post_meta($productId,'_rednao_advanced_product_fees',true);
        if($meta=="")
            return "[]";
        return $meta;


    }

    public function GetAllServerOptions($productId)
    {
        $productId=\apply_filters('woo-extra-product-get-post-id',$productId);
        $previousList=\get_post_meta($productId,'_rednao_advanced_product_server_list',true);
        $serverOptions=array();
        if(\is_array($previousList))
        {
            foreach($previousList as $serverOptionId)
            {
                $options=\get_post_meta($productId,'_rednao_advanced_product_server_options_'.$serverOptionId,true);
                if($options!='')
                    $serverOptions[]=$options;
            }
        }
        return $serverOptions;
    }

    public function GetServerOption($productId,$serverOptionName,$defaultValue='')
    {
        $productId=\apply_filters('woo-extra-product-get-post-id',$productId);
        return get_post_meta($productId,'_rednao_advanced_product_server_options_'.$serverOptionName,true);
    }

    public function SaveProductExtraOptions($productId,$options,$serverOptions,$fees)
    {
        $productId=\apply_filters('woo-extra-product-get-post-id',$productId);
        if($options==''||$options==null)
        {
            \delete_post_meta($productId,'_rednao_advanced_product_options');
            \delete_post_meta($productId,'_rednao_advanced_product_fees');
        }else
        {
            \update_post_meta($productId, '_rednao_advanced_product_options', $options);
            \update_post_meta($productId, '_rednao_advanced_product_fees', $fees);
        }


        $serverOptions=\json_decode(\stripslashes($serverOptions));
        $this->SaveServerOptions($productId,$serverOptions);
    }

    public function GetVariations($productId)
    {
        $productId=\apply_filters('woo-extra-product-get-post-id',$productId);
        $product = wc_get_product( $productId);


        $variations=array();
        $attributes=array();


        if($product && is_object( $product ) )
        {
        if ( is_callable( array( $product, 'get_available_variations' ) ) ) {
            $variations     = $this->GetAvailableVariations( $product );
            $attributes     = $product->get_variation_attributes();
            $all_attributes = $product->get_attributes();
            if ( $attributes ) {
                foreach ( $attributes as $key => $value ) {

                    if(is_array($value))
                        $attributes[ $key ]=array_values($value);
                    else if ( ! $value ) {
                        $attributes[ $key ] = array_map( 'trim', explode( "|", $all_attributes[ $key ]['value'] ) );
                    }

                }
            }
        }else
        {
            $variations = array($this->get_available_variation($productId, $product));
            /** @var WC_Product_Attribute[] $attributes2 */
            $attributes2 = $product->get_attributes();
            $attributes = array();
            foreach ($attributes2 as $currentAttribute)
            {
                $attributes[$currentAttribute->get_name()] = array();
                foreach ($currentAttribute->get_options() as $currentOption)
                {
                    $attributes[$currentAttribute->get_name()][] = $currentOption;
                }
            }
        }



        }

        return array( 'Variations' => $variations, 'Attributes' => $attributes );
    }

    public function GetAttributes($productId,$includeValues=false,$skipAttributesWithVariations=false)
    {
        $productId=\apply_filters('woo-extra-product-get-post-id',$productId);
        $product = wc_get_product( $productId);

        if($product===false)
            return array();

        $attributes=$product->get_attributes();
        $attributesToReturn=array();
        /**
         * @var $key
         * @var  WC_Product_Attribute  $value
         */
        foreach($attributes as $key=>$value)
        {
            if($product->get_type()!='simple'&& $skipAttributesWithVariations&&ArrayUtils::GetValueOrDefault($value->get_data(),'is_variation')==true)
                continue;


            $item=array(
                'Id'=>$key,
                'Name'=>$value['name']
            );



            if($includeValues)
            {
                $item['Options']=[];
                foreach($value['options'] as $optionValue)
                {
                    if($value->is_taxonomy())
                    {
                        $term=\get_term($optionValue);
                        if($term!=null)
                            $item['Options'][]=apply_filters( 'woocommerce_product_attribute_term_name', $term->name, $term );

                    }else
                        $item['Options'][]=$optionValue;
                }
            }
            $attributesToReturn[]=$item;
        }

        return $attributesToReturn;
    }


    public function GetAvailableVariations( $product ) {
        $available_variations = array();

        foreach ( $product->get_children() as $child_id ) {
            $variation    = wc_get_product( $child_id );
            $variation_id = $this->GetVariationId( $variation );
            if ( empty( $variation_id ) || ( 'yes' === get_option( 'woocommerce_hide_out_of_stock_items' ) && ! $variation->is_in_stock() ) ) {
                continue;
            }
            if ( apply_filters( 'woocommerce_hide_invisible_variations', FALSE, $this->GetId( $product ), $variation ) && ! $variation->variation_is_visible() ) {
                continue;
            }

            $available_variations[] = $this->get_available_variation( $variation, $product );
        }

        return $available_variations;
    }

    private function GetId( $product ) {
        if ( is_callable( array( $product, 'get_id' ) ) && is_callable( array( $product, 'get_parent_id' ) ) ) {
            if ( $this->GetProductType( $product ) == "variation" ) {
                return $product->get_parent_id();
            }

            return $product->get_id();
        }
        if ( is_object( $product ) ) {
            return $product->id;
        }

        return 0;
    }

    private function GetProductType( $product = NULL ) {
        if ( is_object( $product ) ) {
            if ( is_callable( array( $product, 'get_type' ) ) ) {
                return $product->get_type();
            } else {
                return $product->product_type;
            }
        }

        return FALSE;
    }

    private function GetVariationId( $product ) {
        if ( is_callable( array( $product, 'get_id' ) ) ) {
            return $product->get_id();
        }

        return $product->variation_id;
    }

    public function get_available_variation( $variation, $product ) {
        if ( is_numeric( $variation ) ) {
            $variation = wc_get_product( $variation );
        }

        if($variation===false||$variation===null)
            return array();

        $stockQuantity=$variation->get_stock_quantity();


        $attributes=array();
        if(\method_exists($variation,'get_variation_attributes'))
            $attributes=$variation->get_variation_attributes();
        else
            $attributes=array();
        return apply_filters( 'tc_epo_woocommerce_available_variation', array(
            'variation_id' => $this->GetVariationId( $variation ),
            'attributes'   => $attributes,
            'is_in_stock'  => $variation->is_in_stock(),
            'stock_quantity'=>$stockQuantity,
            'product_regular_price'=>$variation->get_regular_price(),
            'price'=>$variation->get_price(),
            'sale_price'=>$variation->get_sale_price()
        ), $product, $variation );
    }

    private function SaveServerOptions($productId,  $serverOptions)
    {
        $productId=\apply_filters('woo-extra-product-get-post-id',$productId);
        $serverOptionIds=array();
        foreach ($serverOptions as $currentServerOptions)
        {
            $serverOptionIds[]=$currentServerOptions->Id;
            \update_post_meta($productId,'_rednao_advanced_product_server_options_'.$currentServerOptions->Id,$currentServerOptions);
        }

        $previousList=\get_post_meta($productId,'_rednao_advanced_product_server_list',true);
        if(\is_array($previousList))
        {
            foreach($previousList as $currentList)
            {
                if(!\in_array($currentList,$serverOptionIds))
                    \delete_post_meta($productId,'_rednao_advanced_product_server_options_'.$currentList);
            }
        }

        \update_post_meta($productId,'_rednao_advanced_product_server_list',$serverOptionIds);
    }

    public function SaveTranslations($id,$type, $translations)
    {
        if($translations==null)
            return;
        /** @var Loader $loader */
        $loader=null;
        $loader=apply_filters('woo_extra_products_get_loader',$loader);

        global $wpdb;
        $wpdb->delete($loader->TranslationTable,['id'=>$id,'type'=>$type]);
        foreach($translations as $currentTranslation)
        {
            if(count(array_values((array)$currentTranslation->Translations))==0)
                continue;
            $wpdb->insert($loader->TranslationTable,[
                'id'=>$id,
                'type'=>$type,
                'lang_code'=>$currentTranslation->Language,
                'translations'=>json_encode($currentTranslation->Translations)
            ]);
        }
    }


}