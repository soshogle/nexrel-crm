<?php


namespace rednaowooextraproduct\core\Managers\FormManager\Test;


use stdClass;

class FakeEntry
{
    public $Fields;
    public function __construct($model)
    {
        $this->Fields=array();
        $this->GenerateEntries($model,$this->Fields);

    }

    private function GenerateEntries($model,&$entries)
    {
        foreach($model->Rows as $row)
            foreach($row->Columns as $column)
            {
                $entries[]=$this->GetEntryFromField($column->Field);
            }
    }

    private function GetEntryFromField($field)
    {
        $entryToCreate=new stdClass();
        $entryToCreate->Id=$field->Id;
        $entryToCreate->Type=$field->Type;
        $entryToCreate->PriceType='none';
        $entryToCreate->Price=0;
        $entryToCreate->SalePrice=0;
        $entryToCreate->Quantity=1;
        $entryToCreate->UnitPrice=0;


        switch ($field->Type)
        {
            case 'radio':
            case 'checkbox':
            case 'dropdown':
            case 'imagepicker':
            case 'buttonselection':

                $entryToCreate->SelectedValues=array();
                $entryToCreate->SelectedValues[]=new stdClass();
                $entryToCreate->SelectedValues[0]->Label='[Preview]';
                $entryToCreate->SelectedValues[0]->PriceType='none';
                $entryToCreate->SelectedValues[0]->Id='1';
                $entryToCreate->SelectedValues[0]->Selected=true;

                break;
            case 'list':
                $entryToCreate->Value=array(array('[Preview]','[Preview]'));
                break;
            case 'repeater':
                $entryToCreate->Value=array();
                $this->GenerateEntries((object)array('Rows'=>$field->RowTemplates),$entryToCreate->Value);
                break;
            case 'grouppanel':
            case 'collapsible':
            case 'popup':
                $entryToCreate->Value=array();
                $this->GenerateEntries($field,$entryToCreate->Value);
                break;
            case 'daterange':
                $entryToCreate->StartValue='[Preview]';
                $entryToCreate->EndValue='[Preview]';
                break;
            default:
                $entryToCreate->Value='[Preview]';
                break;
        }

        return $entryToCreate;

    }

}