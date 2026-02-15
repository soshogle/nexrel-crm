<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Core;


use DOMDocument;
use DOMElement;

class HtmlTagWrapper
{
    /** @var DOMElement */
    protected $Node;

    /** @var HtmlTagWrapper[] */
    public $Children;
    /** @var DOMDocument  */
    public $Document;

    /**
     * HtmlTagWrapper constructor.
     * @param $domElement DOMElement
     */
    public function __construct($document,$domElement)
    {
        $this->Document=$document;
        $this->Children=array();
        $this->Node=$domElement;
    }


    /**
     * @param $child HtmlTagWrapper
     */
    public function AppendChild($child)
    {
        if($child==null)
            return;

        $this->Node->appendChild($child->Node);
        $this->Children[]=$child;

    }

    public function SetText($text)
    {
        $this->Clear();
        $text=$this->Document->createTextNode($text);
        $this->Node->appendChild($text);
    }



    public function Clear(){
        foreach($this->Node->childNodes as $node)
        {
            $this->Node->removeChild($node);
        }
    }

    public function GetDomElement(){
        return $this->Node;
    }

    public function AddClass($className)
    {
        $class=$this->Node->getAttribute('class');
        if(\trim($class)!='')
            $class.='';

        $class.=$className;
        if($class!='')
            $this->Node->setAttribute('class',$class);
    }

    public function AddStyle($styleName,$value)
    {
        $this->AddStyles(array($styleName=>$value));
    }

    public function AddStyles($styles)
    {
        $style=$this->Node->getAttribute('style');


        foreach($styles as $styleName=>$value)
        {
            $style.=$styleName.':'.$value.';';
        }

        $this->Node->setAttribute('style',$style);
    }

    public function Remove()
    {
        $this->Node->parentNode->removeChild($this->Node);
    }

    public function SetAttribute($attributeName, $value)
    {
        $this->Node->setAttribute($attributeName,$value);
    }

    public function CloneNode()
    {
        /** @var DOMElement $clonedDomElement */
        $clonedDomElement=$this->Node->cloneNode();
        return new HtmlTagWrapper($this->Document,$clonedDomElement);
    }

    /**
     * @param $elementName
     * @return HtmlTagWrapper
     */
    public function CreateElement($elementName)
    {
        return  new HtmlTagWrapper($this->Document, $this->Document->createElement($elementName));
    }


    public function SetHtml($html)
    {
        $fragment=$this->Document->createDocumentFragment();
        $fragment->appendXML($html);
        $this->Node->appendChild($fragment);
    }

    public function CreateAndAppendChild($elementName)
    {
        $element=$this->CreateElement($elementName);
        $this->AppendChild($element);
        return $element;
    }

}