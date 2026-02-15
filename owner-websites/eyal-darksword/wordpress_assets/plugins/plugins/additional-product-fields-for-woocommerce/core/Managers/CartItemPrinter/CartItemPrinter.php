<?php


namespace rednaowooextraproduct\core\Managers\CartItemPrinter;


use rednaowooextraproduct\core\Managers\FormManager\Fields\FBFieldBase;
use rednaowooextraproduct\core\Utils\ArrayUtils;
use rednaowooextraproduct\Utilities\Sanitizer;
use stdClass;

class CartItemPrinter
{
    /** @var stdClass[] */
    public $Fields;
    public $Options;
    public $Index;
    public $Translations;
    public function __construct($fields,$options=null,$index=0,$translations=null)
    {
        $this->Index=$index;
        $this->Fields=$fields;
        $this->Options=$options;
        $this->Translations=$translations;
    }

    public function MaybeTranslateString($textToTranslate){
        if($this->Translations==null)
            return $textToTranslate;
        if(isset($this->Translations[$textToTranslate]))
            return $this->Translations[$textToTranslate];
        return $textToTranslate;

    }

    public function GetItemData($includeLabel=true)
    {
        $showFieldQuantity=true;
        $showFieldQuantity=apply_filters('woo_extra_products_show_field_quantity',$showFieldQuantity);
        $other_data=array();
        foreach($this->Fields as $field)
        {
            $fieldOptions=$this->GetFieldOptions($field->Id,$this->Options);
            if($fieldOptions!=null&&isset($fieldOptions->SkipInCart)&&$fieldOptions->SkipInCart==true)
                continue;
            $value='';
            if(isset($field->SelectedValues))
            {
                $values=array();
                foreach($field->SelectedValues as $currentValue)
                {
                    if(isset($currentValue->Value))
                        $values[]=$this->MaybeTranslateString($currentValue->Value);
                }
                $value=\implode(', ',$values);
            }else
                if(isset($field->Value))
                    $value=$field->Value;
                else
                    continue;

            $items=[];
            $items=\apply_filters('woo_extra_products_display_'.$field->Type.'_for_cart',$items,$field,$includeLabel,$fieldOptions,$this);
            if(count($items)>0)
            {
                $quantity=1;
                if(isset($field->Quantity))
                    $quantity=Sanitizer::SanitizeNumber($field->Quantity);
                if($quantity>1&&$showFieldQuantity)
                {
                    foreach($items as &$currentItem)
                    {
                        $currentItem['name']=$quantity.'x '.$currentItem['name'];
                        $currentItem['key']=$quantity.'x '.$currentItem['key'];
                    }
                }

                if($this->Index>0)
                {
                    foreach($items as &$currentItem)
                    {
                        $currentItem['key'].=' '.$this->Index;
                    }
                }

                foreach($items as $currentItem)
                {
                    $currentItem['key']=$this->GetUniqueKey($other_data,$currentItem['key']);
                    $other_data[]=$currentItem;
                }
                continue;
            }

            if(in_array($field->Type,['globalcontainer','collapsible','grouppanel','popup','repeater']))
            {
                continue;
            }

            $display = "<div style='width: 100%;display: inline-block;'>";
            $display.="<label> " . esc_html($value) . "</label>
                    </div>";

            $quantity=1;
            if(isset($field->Quantity))
                $quantity=Sanitizer::SanitizeNumber($field->Quantity);
            $label=($quantity>1&&$showFieldQuantity?$quantity.'x ':'').$this->MaybeTranslateString($field->Label);
            if($this->Index>0)
                $label.=' '.($this->Index+1);

            $label=$this->GetUniqueKey($other_data,$label);


            if(\is_array($value)&&count($value)>0)
                $other_data[]=array('name'=>$field->Label,'value'=>$display,'field'=>$field,'key'=>$label,'display'=>$display,'display_key'=>$label);
            else
            if(\is_scalar($value)&&trim($value)!='')
                $other_data[]=array('name'=>$field->Label,'value'=>$value,'field'=>$field,'key'=>$label,'display'=>nl2br($display),'display_key'=>$label);
            else
                $other_data[]=array('name'=>$field->Label,'value'=>$display,'field'=>$field,'key'=>$label,'display'=>$display,'display_key'=>$label);



        }


        return $other_data;
    }


    private function GetUniqueKey($itemList,$key)
    {
        $index=0;
        $baseKey=$key;
        while (ArrayUtils::Find($itemList,function ($item) use($key){
                return $item["key"]==$key;
            })!=null){
            $index++;
            $key=$baseKey.' '.$index;
        }

        return $key;
    }

    private function GetFieldOptions($Id,$container)
    {
        if($container==null)
            return null;

        $rows=[];
        if(isset($container->Rows))
            $rows=$container->Rows;
        if(isset($container->RowTemplates))
            $rows=$container->RowTemplates;

        if(isset($container->Type)&&$container->Type=='survey')
            return null;

        foreach($rows as $currentRow)
        {
            foreach($currentRow->Columns as $currentColumn)
            {
                if(!isset($currentColumn->Field))
                    continue;
                if($currentColumn->Field->Id==$Id)
                    return $currentColumn->Field;
                $childField=$this->GetFieldOptions($Id,$currentColumn->Field);
                if($childField!=null)
                    return $childField;
            }
        }

        return null;

    }

}