/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { useWooBlockProps } from '@woocommerce/block-templates';
import { __experimentalUseProductEntityProp as useProductEntityProp } from '@woocommerce/product-editor';
import { Flex, Button, Icon } from '@wordpress/components';
import { MediaUpload } from '@wordpress/media-utils';
import { uniqBy } from 'lodash';

/**
 * Internal dependencies
 */
import './editor.scss';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 */
export function Edit( { attributes } ) {
	const blockProps = useWooBlockProps( attributes );

	const { property } = attributes;

	const [ variationImages, setVariationImagesValue ] = useProductEntityProp(
		property,
		{
			postType: 'product_variation',
			fallbackValue: false,
		}
	);

	return (
		<div { ...blockProps }>
			<Flex justify="normal" wrap style={ { marginBottom: '20px' } }>
				{ variationImages.map( ( variationImage ) => (
					<div
						key={ variationImage.id }
						className="wp-block-iconic-woothumbs-variation-images"
						title={ __( 'Remove image', 'iconic-woothumbs' ) }
					>
						<div
							className="wp-block-iconic-woothumbs-variation-images__image-wrap"
							onClick={ () => {
								setVariationImagesValue(
									variationImages?.filter(
										( image ) =>
											image.id !== variationImage.id
									)
								);
							} }
						>
							<Icon
								className="wp-block-iconic-woothumbs-variation-images__image-remove-button"
								icon="remove"
								style={ {
									fontFamily: 'dashicons',
								} }
								title={ __(
									'Remove image',
									'iconic-woothumbs'
								) }
							/>

							<img
								src={ variationImage.url }
								className="wp-block-iconic-woothumbs-variation-images__image"
							/>
						</div>
					</div>
				) ) }
			</Flex>

			<MediaUpload
				allowedTypes="image"
				multiple
				onSelect={ ( medias ) => {
					const images = medias.map( ( media ) => ( {
						id: media.id,
						url: media.url,
					} ) );

					setVariationImagesValue(
						uniqBy( [ ...variationImages, ...images ], 'id' )
					);
				} }
				render={ ( { open } ) => (
					<Button onClick={ open } variant="secondary" size="compact">
						{ __( 'Add Variation Images', 'iconic-woothumbs' ) }
					</Button>
				) }
			/>
		</div>
	);
}
