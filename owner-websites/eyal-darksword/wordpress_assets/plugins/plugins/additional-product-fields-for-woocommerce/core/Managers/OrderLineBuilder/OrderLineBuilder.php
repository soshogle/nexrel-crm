<?php


namespace rednaowooextraproduct\core\Managers\OrderLineBuilder;


use rednaowooextraproduct\dto\EntryDTO;
use rednaowooextraproduct\dto\EntryFieldDTO;
use rednaowooextraproduct\dto\LineItemDTO;
use stdClass;
use WC_Order;
use WC_Order_Item_Product;
use WC_Order_Item_Tax;

class OrderLineBuilder
{

    /** @var WC_Order */
    public $Order;
    /** @var WC_Order_Item_Product */
    public $Item;
    /** @var LineItemDTO[] */
    public $LineItems;
    public $Taxes;
    public function Initialize($order,$item,$lineItems){
        $this->Order=$order;
        $this->Taxes=$this->GetTaxes();
        $this->LineItems=$lineItems;
        $this->Item=$item;
        $this->CalculateTaxes($this->LineItems);
    }

    private function CalculateTaxes($lineItems)
    {
        $tax_based_on = get_option( 'woocommerce_tax_based_on' );

        if ( $tax_based_on=='billing') {
            $country  = $this->Order->get_billing_country();
            $state    = $this->Order->get_billing_state();
            $postcode = $this->Order->get_billing_postcode();
            $city     = $this->Order->get_billing_city();
        } elseif ( 'shipping' === $tax_based_on ) {
            $country  = $this->Order->get_shipping_country();
            $state    = $this->Order->get_shipping_state();
            $postcode = $this->Order->get_shipping_postcode();
            $city     = $this->Order->get_shipping_city();
        }

        if($tax_based_on==='base'||empty($country))
        {
            $default  = wc_get_base_location();
            $country  = $default['country'];
            $state    = $default['state'];
            $postcode = '';
            $city     = '';
        }


        $tax_class = $this->Item->get_tax_class();
        $tax_rates = \WC_Tax::find_rates( array(
            'country'   => $country,
            'state'     => $state,
            'postcode'  => $postcode,
            'city'      => $city,
            'tax_class' => $tax_class
        ) );

        $taxes=$this->Order->get_taxes();
        foreach($lineItems as $lineItem)
        {
            if($lineItem->Type=='grouppanel'||$lineItem->Type=='collapsible'||$lineItem->Type=='globalcontainer'||$lineItem->Type=='popup')
            {
                 $this->CalculateTaxes($lineItem->Value);
            }else
                if($lineItem->Type=='repeater')
                {
                    foreach($lineItem->Value as &$repeaterItem)
                        $this->CalculateTaxes($repeaterItem);
                }else
           /* if(isset($lineItem->SelectedValues))
            {
                foreach($lineItem->SelectedValues as $subLineItem)
                {
                    $this->AddTaxes($subLineItem, $taxes, $tax_rates);
                }
            }else*/
                $this->AddTaxes($lineItem, $taxes, $tax_rates);
        }




    }

    /**
     * @param LineItemDTO $field
     * @param array $taxes
     * @param $tax_rates
     */
    private function AddTaxes($field, array $taxes,$tax_rates)
    {
        $field->Taxes=array();
        $field->TotalTax=0;
        $totalTax=0;
        /** @var WC_Order_Item_Tax $currentTax */

        $rates=[];
        if(isset($field->Price)&&\is_numeric($field->Price))
            $rates = \WC_Tax::calc_tax($field->Price, $tax_rates,$this->Order->get_prices_include_tax());
        foreach($taxes as $currentTax)
        {
            $taxToUse=(object)array('Price'=>0,'Name' => $currentTax->get_label(),);
            foreach ($rates as $key => $value)
            {
                $field->TotalTax += $value;

                if ($currentTax->get_rate_id() == $key)
                {
                    $taxToUse = (object)array('Name' => $currentTax->get_label(), 'Price' => $value);
                }


            }

            $field->Taxes[]=$taxToUse;
        }



    }

    public function Execute()
    {
        $this->CreateRow();

    }


    private function CreateRow()
    {
        $currency=array(
            'Format'=>get_woocommerce_price_format(),
            'Decimals'=>wc_get_price_decimals(),
            'ThousandSeparator'=>wc_get_price_thousand_separator(),
            'DecimalSeparator'=>wc_get_price_decimal_separator(),
            'Symbol'=>get_woocommerce_currency_symbol(),
        );

        $nonce=\wp_create_nonce('rednaowooextraproduct_order_designer');
        $variableId="rnExtraProductOptions".$this->Item->get_id();
        echo '</tbody>';
        echo '<tbody id="rnExtraProductRow_'.$this->Item->get_id().'" style="background-color:#fbfbfb" class="item" data-order-item-id="'.esc_attr($this->Order->get_id()).'" data-item-option-id="'.\esc_attr__($this->Item->get_id()).'">';
        echo '<tr>';
        echo '<td colspan="100">
                <div style="display: flex;align-items: center;">
                    <img src="' . esc_url(get_admin_url(null, 'images/spinner.gif')) . '">
                    <span style="margin-left: 5px;">'.__("Loading Items").'</span>
                </div>
              </td>';
        echo "<script type=\"text/javascript\">
                    
                    var $variableId=".\json_encode(array(
                                            'OrderLineId'=>$this->Item->get_id(),
                                            'Data'=>$this->LineItems,
                                            'Id'=>$this->Item->get_id(),
                                            'Currency'=>$currency,
                                            'MapsBaseURL'=>'',
                                            'IsEditable'=>$this->Order->is_editable(),
                                            'Nonce'=>$nonce,
                                            'Taxes'=>$this->Taxes
                                        )).";
                    if(typeof RedNaoOrderDashboard!='undefined')
                        RedNaoOrderDashboard.ProductLoader($variableId);
                    else
                        var interval_$variableId=setInterval(function(){
                            if(typeof RedNaoOrderDashboard!='undefined')
                            {
                                clearInterval(interval_$variableId);
                                RedNaoOrderDashboard.ProductLoader($variableId);
                            }                        
                        }
                        ,100);                    
                    
             </script>";
       /* echo "<td></td>";
        $this->CreateNameColumn($item);
        $this->CreateCost($item);
        $this->CreateQty($item);
        $this->CreateTotal($item);
        $this->CreateTaxes($item);
        $this->CreateEditActions($item);*/
        echo "</tr>";
        echo '</tbody>';
        echo '<tbody>';
    }

    private function CreateNameColumn($item)
    {
        $processedItem=null;
        $processedItem=\apply_filters('woo-extra-products-prepare-order-item',$processedItem,$item);

        if($processedItem!=null)
        {
            echo $processedItem;
            return;
        }

        echo  "<td> 
                    <table style='width: 100%'>
                        <tr>
                            <td style='width: 50%;padding:0;border-bottom: none;'>
                              <div style='width: 50%'>
                                     ".\esc_html($item->Label)."    
                                </div>
                            </td>
                            <td style='width: :50%;padding:0;border-bottom: none;'>                            
                                <div class=\"view\" style='width: 50%'>
                                    
                                    <div style='width: 50%'>
                                        ".\esc_html($item->Value)."   
                                    </div>
                                
                                </div>                    
                                <div class=\"edit\" style='display: none;,width:50%;'>
                                    <div style='width:100%'>
                                        <textarea name=\"".$this->GetItemName($item,'value')."\">".\esc_html($item->Value)."</textarea>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </table>
                  

                </td>";
    }

    private function CreateEditActions($item)
    {
        if(!$this->Order->is_editable())
        {
            echo '<td></td>';
            return;
        }
        echo '<td class="wc-order-edit-line-item" width="1%">
                    <div class="wc-order-edit-line-item-actions">                        
                            <input class="rnDeletedInput" type="hidden" name="'.$this->GetItemName($item,'Deleted').'" value="0">
                            <a class="edit-order-item tips" href="#" data-tip="Edit item"></a>
                            <a class="rn-delete-order-item" href="#" data-tip="Delete item"></a>                        
                    </div>
                </td>';
    }

    private function CreateCost($item)
    {
        echo '<td class="item_cost" >';
        echo '<div class="view">';
                echo \wc_price($item->UnitPrice,$this->Order->get_currency());
        echo '</div>';
        if($this->Order->is_editable())
        {
            echo '<div class="edit" style="display: none">';
            echo '<input type="number"  name="'.$this->GetItemName($item,'unitprice').'" value="' . esc_attr($item->UnitPrice) . '"/>';
            echo '</div>';
        }
        echo '</td>';

    }

    private function CreateQty($item)
    {
        echo '<td class="quantity" style="text-align: right;">';
        echo '<div class="view">';
        echo \esc_html($item->Quantity);
        echo '</div>';
        if($this->Order->is_editable())
        {
            echo '<div class="edit" style="display: none">';
            echo '<input type="number" name="'.$this->GetItemName($item,'quantity').'" value="' . esc_attr($item->Quantity) . '"/>';
            echo '</div>';
        }
        echo '</td>';
    }

    private function CreateTotal($item)
    {
        echo '<td class="line_cost" style="text-align: right;">';
        echo '<div class="view">';
        echo \wc_price($item->Price,$this->Order->get_currency());;
        echo '</div>';
        echo '</td>';

    }

    private function CreateTaxes($item)
    {
        foreach($item->Taxes as $currentTax)
        {
            echo '<td class="tax" style="text-align: right;">';
            echo '<div class="view">';
            echo \wc_price($currentTax->Price,$this->Order->get_currency());;
            echo '</div>';
            echo '</td>';
        }
    }

    private function GetTaxes()
    {
        $taxesToReturn=array();

        $taxes=$this->Order->get_taxes();
        foreach($taxes as $tax)
        {
            $taxesToReturn[]=$tax->get_label();
        }

        return $taxesToReturn;
    }

    private function GetItemName($item,$property)
    {
        return 'rnLineItems['.esc_attr($this->Item->get_id()).']['.esc_attr($item->Id).']['.\esc_attr($property).']';
    }


}