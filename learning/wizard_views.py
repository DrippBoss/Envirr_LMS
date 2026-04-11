from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from django.db import transaction
from .models import CourseUnit, LearningPath, LearningNode, ContentTemplate

class AdminWizardBaseView(APIView):
    """
    Base view for Course Wizard endpoints.
    Strictly restricts access to user accounts with the 'admin' role.
    IsAdminUser handles checking `request.user.is_staff` by default in DRF,
    but we may need to specifically check `request.user.role == 'admin'` depending on how IsAdminUser is configured.
    Assuming the default IsAdminUser checks `is_staff`, but we will add an explicit check to be safe.
    """
    permission_classes = [IsAdminUser]

class WizardTemplateListView(AdminWizardBaseView):
    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
            
        templates = ContentTemplate.objects.all().values('id', 'name', 'template_type', 'description', 'config_json')
        return Response(list(templates))

class WizardCourseCreateView(AdminWizardBaseView):
    @transaction.atomic
    def post(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        
        unit = CourseUnit.objects.create(
            title=data.get('title', 'New Unit'),
            subject=data.get('subject', 'General Subject'),
            class_grade=data.get('class_grade', '10'),
            board=data.get('board', ''),
            description=data.get('description', ''),
            order=CourseUnit.objects.count() + 1,
            is_published=False
        )
        
        for ch_idx, chap_data in enumerate(data.get('chapters', [])):
            path = LearningPath.objects.create(
                unit=unit,
                title=chap_data.get('title', f'Chapter {ch_idx+1}'),
                class_grade=unit.class_grade,
                is_active=True
            )
            for node_idx, node_data in enumerate(chap_data.get('nodes', [])):
                template_id = node_data.get('template_id')
                node_type = node_data.get('type', 'LESSON')
                
                xp_reward = 10
                practice_count = 5
                
                if template_id:
                    try:
                        t = ContentTemplate.objects.get(id=template_id)
                        xp_reward = t.config_json.get('xp_reward', 10)
                        practice_count = t.config_json.get('practice_question_count', 5)
                        if 'node_type' in t.config_json:
                            node_type = t.config_json['node_type']
                    except ContentTemplate.DoesNotExist:
                        pass
                
                LearningNode.objects.create(
                    path=path,
                    title=node_data.get('title', f'Node {node_idx+1}'),
                    node_type=node_type,
                    order=node_idx + 1,
                    xp_reward=xp_reward,
                    practice_question_count=practice_count
                )
                
        return Response({'message': 'Course structure created', 'unit_id': unit.id}, status=status.HTTP_201_CREATED)

class WizardReorderView(AdminWizardBaseView):
    @transaction.atomic
    def post(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        model_name = request.data.get('model')
        updates = request.data.get('updates', [])
        
        if model_name == 'LearningNode':
            for u in updates:
                LearningNode.objects.filter(id=u['id']).update(order=u['order'])
        elif model_name == 'CourseUnit':
            for u in updates:
                CourseUnit.objects.filter(id=u['id']).update(order=u['order'])
                
        return Response({'message': 'Reordered successfully'})

class WizardBulkUploadView(AdminWizardBaseView):
    def post(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        node_id = request.data.get('node_id')
        files = request.FILES.getlist('files')
        
        if not node_id or not files:
            return Response({'error': 'node_id and files are required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            node = LearningNode.objects.get(id=node_id)
            for f in files:
                if f.name.endswith('.mp4'):
                    node.video_file = f
                    node.save()
                    break # one video per node for now
            return Response({'message': 'Files uploaded successfully'})
        except LearningNode.DoesNotExist:
            return Response({'error': 'Node not found'}, status=status.HTTP_404_NOT_FOUND)
