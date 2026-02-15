<?php


namespace rednaowooextraproduct\core;




use rednaowooextraproduct\core\Managers\CartFormatManager\ButtonSelectionFormatter;
use rednaowooextraproduct\core\Managers\CartFormatManager\GoogleMapsAddressFormatter;
use rednaowooextraproduct\core\Managers\CartFormatManager\TextualImageFormatter;
use rednaowooextraproduct\Utilities\Sanitizer;

class FreeCartItemPrinter
{
    /** @var Loader */
    public $Loader;
    public function __construct($loader)
    {
        $this->Loader=$loader;
        \add_filter('woo_extra_products_display_total_for_cart',array($this,'TotalFormat'),10,5);
        \add_filter('woo_extra_products_display_switch_for_cart',array($this,'SwitchFormat'),10,5);
        \add_filter('woo_extra_products_display_colorpicker_for_cart',array($this,'ColorPickerFormat'),10,5);
        \add_filter('woo_extra_products_display_buttonselection_for_cart',array($this,'ButtonSelectionFormat'),10,5);
        \add_filter('woo_extra_products_display_signature_for_cart',array($this,'SignatureFormat'),10,5);
        \add_filter('woo_extra_products_display_colorswatcher_for_cart',array($this,'ColorSwatcherFormat'),10,5);
        \add_filter('woo_extra_products_display_termofservice_for_cart',array($this,'TermOfServiceFormat'),10,5);
        \add_filter('woo_extra_products_display_googlemaps_for_cart',array($this,'GoogleMapsFormat'),10,5);
        \add_filter('woo_extra_products_display_textualimage_for_cart',array($this,'TextualImageFormat'),10,5);
        \add_filter('woo_extra_products_display_textwithstyles_for_cart',array($this,'TextWithStyleFormat'),10,5);

    }


    public function TextWithStyleFormat($return,$value,$includeLabel=true,$field=null,$cartItemPrinter=null)
    {
        if(isset($value->Value))
            return [["name"=>$value->Label,
                'value'=>sanitizer::SanitizeString(wp_kses($value->Value,[])),
                'field'=>'',
                'key'=>$value->Label,
                'display'=>Sanitizer::SanitizeHTML($value->Value)]];
        return '';
    }

    public function TextualImageFormat($return,$value,$includeLabel=true,$field=null,$cartItemPrinter=null)
    {
        return (new TextualImageFormatter($value))->Format($includeLabel);
    }

    public function GoogleMapsFormat($return,$value,$includeLabel=true,$field=null,$cartItemPrinter=null){
        return (new GoogleMapsAddressFormatter($value))->Format($includeLabel);
    }

    public function TermOfServiceFormat($return,$value,$includeLabel=true,$field=null,$cartItemPrinter=null)
    {
        $display="
                    <div style='width: 100%'>";

        if($value->Label!=''&&$includeLabel)
            $display.="<label style='font-weight: bold;'>" . esc_html($value->Label) . ":</label>";

        $url='';
        $alt='';
        if($value->Value)
        {
            $url = esc_attr($this->Loader->URL . 'images/icons/check.png');
            $alt=__('Yes');
        }
        else
        {
            $url = esc_attr($this->Loader->URL . 'images/icons/times.png');
            $alt=__('No');
        }

        $display.="<img style='width:16px;height:16px;margin-left:4px' src='$url' alt='$alt'/>
                    </div>    
                ";

        return [array('name'=>$value->Label,'value'=>Sanitizer::GetStringValueFromPath($value,['Value']) ,'field'=>$field,'key'=>$value->Label,'display'=>$display)];

    }

    public function ColorSwatcherFormat($return,$value,$includeLabel=true,$field=null,$cartItemPrinter=null)
    {
        $html="<div style='width: 100%;clear: both;'>";
        if($includeLabel&&trim($value->Label)!='')
            $html.="<label style='font-weight: bold;display:block;'>" . esc_html($value->Label) . ":</label>";
        $values=[];
        foreach($value->SelectedValues as  $currentItem)
        {
            $html.="<div class='extraProductInline' style='display: inline-block;text-align: center;margin:5px;'>";

            $type='';
            if(isset($currentItem->Type))
                $type=$currentItem->Type;

            $values[]=$currentItem->Color;

            switch ($type)
            {
                case 'text':
                    $html.="<div style='border:1px solid #dfdfdf;border-radius: 100000px; line-height: 30px; min-height: 30px;min-width: 30px; font-weight: bold;justify-content: center;align-items: center;display: flex;'>".esc_html($currentItem->Color)."</div>";
                    break;
                case 'image':
                    $html.="<div style='background-size:cover;margin:auto;border:1px solid #dfdfdf;width:30px;height:30px;border-radius:50px;background-image:url(".$currentItem->Color.");'></div>";
                    break;
                default:
                    $html.="<div style='margin:auto;border:1px solid #dfdfdf;width:30px;height:30px;border-radius:50px;background-color:".$currentItem->Color.";'></div>";
                    break;
            }


            if(isset($currentItem->Value)&&$currentItem->Value!='')
            {
                $html.='<label>'.esc_html($currentItem->Value).'</label>';
            }
            $html.="</div>";
            
        }

        $html.='</div>';

        return [array('name'=>$value->Label,'value'=>implode(', ',$values),'field'=>$field,'key'=>$value->Label,'display'=>$html)];
    }


    public function SignatureFormat($return,$value,$includeLabel=true,$field=null,$cartItemPrinter=null)
    {
        $html="
                    <div style='width: 100%;display: block;'>";
        if($includeLabel)
            $html.="<label style='font-weight: bold;display:block;'>" . esc_html($value->Label) . ":</label>";

        $url=admin_url( 'admin-ajax.php').'?action='.$this->Loader->Prefix.'_getpublicfileupload&path='.\basename($value->Path).'&name='.'signature';

        if(isset($value->Value)&&$value->Value!='p')
            $url.='&temp=true';
        $html.="<div style='display: inline-block;'>
                            <img style='width:120px;height:120px;' src='" .esc_attr__($url)."'/>    
                        </div>
                        
                    </div>    
                ";
        return [array('name'=>$value->Label,'value'=>$url,'field'=>$field,'key'=>$value->Label,'display'=>$html)];

    }

    public function ColorPickerFormat($return,$value,$includeLabel=true,$field=null,$cartItemPrinter=null){
        $html='';
        $html.="
                    <div style='width: 100%;clear: both;'>";
            if($includeLabel)
                $html.="<label style='font-weight: bold;'>" . esc_html($value->Label) . ":</label>";
            $html.="<div>
                            <p style='margin:0;float:left;display: inline-block; margin-right: 2px;width:10px;height:10px; border-radius: 100px; background-color: ".$value->Value."'></p><span>". esc_html($value->Value) ."</span>    
                        </div>
                        
                    </div>    
                ";

        return [array('name'=>$value->Label,'value'=>Sanitizer::GetStringValueFromPath($value,['Value']),'field'=>$field,'key'=>$value->Label,'display'=>$html)];
    }



    public function ButtonSelectionFormat($return, $value,$includeLabel=true,$field=null,$cartItemPrinter=null){
        return (new ButtonSelectionFormatter($value))->Format($includeLabel);
    }

    public function SwitchFormat($return,$value,$includeLabel=true,$field=null,$cartItemPrinter=null)
    {
        $html='';
        $alt='';
        if($value->Value)
        {
            $url = esc_attr($this->Loader->URL . 'images/icons/check.png');
            $alt=__('Yes');
        }
        else
        {
            $url = esc_attr($this->Loader->URL . 'images/icons/times.png');
            $alt=__('No');
        }

        $html.="<div style='width: 100%;display: flex;align-items: center;'>";
        if($includeLabel)
            $html.="<label style='font-weight: bold;'>" . esc_html($value->Label) . ":</label>";
        $html.="<img style='width:16px;height: 16px;margin-left: 3px;' alt='$alt' src='$url' />                        
                    </div>    
                ";
        return [array('name'=>$value->Label,'value'=>Sanitizer::GetStringValueFromPath($value,['Value']),'field'=>$field,'key'=>$value->Label,'display'=>$html)];

    }

    public function TotalFormat($return,$value,$includeLabel=true,$field=null,$cartItemPrinter=null)
    {
        $html='';
        $alt='';

        $rawValue=Sanitizer::GetStringValueFromPath($value,['Value','Value']);
        $html='<div>'.esc_html($rawValue).'</div>';

        return [array('name'=>$value->Label,'value'=>Sanitizer::GetStringValueFromPath($value,['Value','Amount']),'field'=>$field,'key'=>$value->Label,'display'=>$html)];

    }
}