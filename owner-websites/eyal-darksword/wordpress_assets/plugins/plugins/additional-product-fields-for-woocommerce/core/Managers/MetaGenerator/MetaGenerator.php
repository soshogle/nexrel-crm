<?php

namespace rednaowooextraproduct\core\Managers\MetaGenerator;

use rednaowooextraproduct\core\Managers\FileManager\FileManager;
use rednaowooextraproduct\Utilities\Sanitizer;

class MetaGenerator
{
    private $Options;
    private $Loader;
    public function __construct($loader,$options)
    {
        $this->Loader=$loader;
        $this->Options=$options;
    }

    public function Generate($fields){

        $meta=[];
        foreach($fields as $fieldEntry)
        {
            $fieldOptions = $this->GetFieldOptions($fieldEntry->Id, $this->Options);
            if ($fieldOptions == null)
                continue;

            $value=null;
            switch($fieldOptions->Type)
            {
                case 'textwithstyles':
                case 'text':
                case 'sizechart':
                case 'slider':
                case 'colorpicker':
                case 'masked':
                case 'datepicker':
                case 'textarea':
                case 'number':
                    $value=Sanitizer::GetStringValueFromPath($fieldEntry,['Value']);
                    break;
                case 'rating':
                    $value=Sanitizer::GetStringValueFromPath($fieldEntry,['Value','Value']);
                    break;
                case 'range':
                    $rangeData=Sanitizer::GetValueFromPath($fieldEntry,['Value']);
                    if($rangeData==null)
                        break;
                    foreach($rangeData as $currentRange)
                    {
                        $value[]=[
                            "Label"=>$currentRange->Label,
                            "Value"=>$currentRange->Value
                        ];
                    }

                    break;
                case 'groupbutton':
                case 'likertscale':
                case 'searchabledropdown':
                case 'imagepicker':
                case 'buttonselection':
                case 'checkbox':
                case 'radio':
                case 'dropdown':
                case 'fontpicker':
                    if(!isset($fieldEntry->SelectedValues)||!is_array($fieldEntry->SelectedValues))
                        break;

                    foreach($fieldEntry->SelectedValues as $currentValue)
                    {
                        $value[]=[$currentValue->Value];
                    }

                    break;
                case 'survey':
                    if(!isset($fieldEntry->SelectedValues)||!is_array($fieldEntry->SelectedValues))
                        break;

                    $value=[];
                    foreach($fieldEntry->SelectedValues as $currentValue)
                    {
                        $row=Sanitizer::GetStringValueFromPath($currentValue,['Row','Label']);
                        $column=Sanitizer::GetStringValueFromPath($currentValue,['Column','Label']);

                        if($row==null||$column==null)
                            continue;

                        $value[]=$row.' - '.$column;
                    }
                    break;
                case 'popup':
                case 'collapsible':
                case 'grouppanel':
                    $value=$this->Generate($fieldEntry->Value);
                    if(count($value)>0)
                        $meta=array_merge($meta,$value);
                    $value=null;
                    break;
                case 'repeater':
                    foreach($fieldEntry->Value as $currentValue)
                    {
                        $value=$this->Generate($currentValue);
                        if(count($value)>0)
                            $meta=array_merge($meta,$value);
                    }

                    break;
                case 'daterange':
                    $start=Sanitizer::GetStringValueFromPath($fieldEntry,['Value','StartValue']);
                    $end=Sanitizer::GetStringValueFromPath($fieldEntry,['Value','EndValue']);

                    if($start==null||$end==null)
                        break;
                    $value=$start.' - '.$end;
                    break;
                case 'fileupload':
                    if(!isset($fieldEntry->Value)||!is_array($fieldEntry->Value))
                        break;
                    $files = $fieldEntry->Value;
                    if ($files == null || !is_array($files))
                        break;
                    $value = [];
                    foreach ($files as $valueRow)
                    {
                        $fileManager = new FileManager($this->Loader);
                        $additionalParams = '';
                        if (strpos($valueRow->Path, $fileManager->GetTempFolderRootPath()) === 0)
                        {
                            $additionalParams = '&temp=true';

                        }
                        $value[] = admin_url('admin-ajax.php') . '?action=' . $this->Loader->Prefix . '_getpublicfileupload&path=' . basename($valueRow->Path) . '&name=' . $valueRow->Name.$additionalParams;
                    }

                    if(count($value)==1)
                        $value=$value[0];
                    break;
                case 'list':
                    if(!isset($fieldEntry->Value)||!is_array($fieldEntry->Value))
                        break;
                    $value=$fieldEntry->Value;
                    break;
                case 'total':
                    $value=Sanitizer::GetValueFromPath($fieldEntry,['Value','Amount']);
                    break;
                case 'textualimage':
                    if(!isset($fieldEntry->Value)||!isset($fieldEntry->Value->Texts)||!is_array($fieldEntry->Value->Texts))
                        break;

                    $value=[];
                    foreach($fieldEntry->Value->Texts as $currentText)
                    {
                        $value[]=$currentText->Value;
                    }
                    break;
                case 'signature':

                    $value=admin_url( 'admin-ajax.php').'?action='.$this->Loader->Prefix.'_getpublicfileupload&path='.\basename($fieldEntry->Path).'&name='.'signature';
                    break;

            }

            if($value==null)
                continue;

            $fieldName=Sanitizer::GetStringValueFromPath($fieldOptions,['FieldName']);
            if($fieldName==null)
                $fieldName='_rnex_'.$fieldEntry->Id;
            else
                if(strpos($fieldName,'_')!==0)
                {
                    $fieldName='_'.$fieldName;//Force the meta key to start with _ so it is not displayed on the cart or checkout page
                }
            $meta[]=[
                'key'=>$fieldName,
                'value'=>$value
                ];


        }

        return apply_filters('woo-extra-product-meta-key-generated',$meta,$this->Options);

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